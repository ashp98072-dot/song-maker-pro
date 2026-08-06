import { useState, useRef, useCallback, useEffect } from 'react';
import { GripVertical, Minimize2, Maximize2 } from 'lucide-react';

interface DraggablePanelProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

export default function DraggablePanel({
  title,
  icon,
  children,
  defaultWidth = 400,
  defaultHeight = 200,
  minWidth = 280,
  minHeight = 120,
}: DraggablePanelProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: defaultWidth, h: defaultHeight });
  const [isFloating, setIsFloating] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (!isFloating) return;
    setIsDragging(true);
    const rect = panelRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  }, [isFloating]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
  }, [size]);

  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
      }
      if (isResizing) {
        const dw = e.clientX - resizeStart.current.x;
        const dh = e.clientY - resizeStart.current.y;
        setSize({
          w: Math.max(minWidth, resizeStart.current.w + dw),
          h: Math.max(minHeight, resizeStart.current.h + dh),
        });
      }
    };

    const handleUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, isResizing, minWidth, minHeight]);

  // Touch support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isFloating) return;
    setIsDragging(true);
    const touch = e.touches[0];
    const rect = panelRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
  }, [isFloating]);

  useEffect(() => {
    if (!isDragging) return;
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      setPosition({ x: touch.clientX - dragOffset.current.x, y: touch.clientY - dragOffset.current.y });
    };
    const handleTouchEnd = () => setIsDragging(false);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  const floatingStyle = isFloating ? {
    position: 'fixed' as const,
    left: position.x,
    top: position.y,
    width: size.w,
    zIndex: 90,
  } : {};

  return (
    <div
      ref={panelRef}
      className={`glass-card overflow-hidden transition-shadow ${isFloating ? 'shadow-2xl border-gold/30' : ''} ${isDragging ? 'opacity-90' : ''}`}
      style={floatingStyle}
    >
      {/* Header - draggable */}
      <div
        className={`flex items-center gap-2 px-4 py-2 border-b border-border select-none ${isFloating ? 'cursor-grab active:cursor-grabbing' : ''}`}
        onMouseDown={handleDragStart}
        onTouchStart={handleTouchStart}
      >
        {isFloating && <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />}
        {icon}
        <h3 className="text-sm font-semibold text-foreground flex-1">{title}</h3>
        <button
          onClick={() => setIsCollapsed(c => !c)}
          className="p-1 text-muted-foreground hover:text-foreground rounded"
          title={isCollapsed ? 'Expandir' : 'Minimizar'}
        >
          {isCollapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
        </button>
        <button
          onClick={() => {
            setIsFloating(f => !f);
            if (!isFloating && panelRef.current) {
              const rect = panelRef.current.getBoundingClientRect();
              setPosition({ x: rect.left, y: rect.top });
            }
          }}
          className={`px-2 py-0.5 text-[10px] rounded border ${isFloating ? 'border-gold text-gold' : 'border-border text-muted-foreground'}`}
        >
          {isFloating ? 'Anclar' : 'Flotar'}
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-4" style={isFloating ? { maxHeight: size.h - 40, overflowY: 'auto' } : {}}>
          {children}
        </div>
      )}

      {/* Resize handle */}
      {isFloating && !isCollapsed && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeStart}
        >
          <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 16 16">
            <path d="M14 14L8 14L14 8Z" fill="currentColor" opacity={0.4} />
          </svg>
        </div>
      )}
    </div>
  );
}
