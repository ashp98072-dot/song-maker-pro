import { useState } from 'react';
import { Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { toast } from 'sonner';

const SUGGESTED = [5, 10, 20];
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'sb';

export default function DonatePage() {
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number>(10);
  const [custom, setCustom] = useState<string>('');

  const finalAmount = custom ? parseFloat(custom) : amount;
  const isValid = !isNaN(finalAmount) && finalAmount >= 1;

  return (
    <div className="container px-4 py-8 max-w-2xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="w-16 h-16 mx-auto rounded-full gold-gradient flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 text-primary-foreground" fill="currentColor" />
        </div>
        <h1 className="text-3xl font-bold font-display text-foreground mb-2">
          Apoya este proyecto
        </h1>
        <p className="text-muted-foreground">
          Tu donación nos ayuda a mantener Worship Transpose libre, sin anuncios y mejorando para músicos de todo el mundo.
        </p>
      </motion.div>

      <div className="glass-card p-6 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground mb-3">Elige un monto sugerido (USD):</p>
          <div className="grid grid-cols-3 gap-2">
            {SUGGESTED.map(v => (
              <button
                key={v}
                onClick={() => { setAmount(v); setCustom(''); }}
                className={`py-3 rounded-lg border text-sm font-semibold transition-colors ${
                  !custom && amount === v
                    ? 'gold-gradient text-primary-foreground border-transparent'
                    : 'border-border text-foreground hover:border-gold/40'
                }`}
              >
                ${v}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-2 block">O monto personalizado (USD):</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <input
              type="number"
              min="1"
              step="1"
              value={custom}
              onChange={e => setCustom(e.target.value)}
              placeholder="Otro monto"
              className="w-full pl-7 pr-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
            />
          </div>
        </div>

        <div className="pt-2">
          {isValid ? (
            <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: 'USD', intent: 'capture' }}>
              <PayPalButtons
                key={finalAmount}
                style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'donate' }}
                createOrder={(_, actions) => actions.order.create({
                  intent: 'CAPTURE',
                  purchase_units: [{
                    amount: { currency_code: 'USD', value: finalAmount.toFixed(2) },
                    description: 'Donación a Worship Transpose',
                  }],
                })}
                onApprove={async (_, actions) => {
                  if (actions.order) {
                    await actions.order.capture();
                  }
                  navigate('/payment-success', { state: { amount: finalAmount } });
                }}
                onError={(err) => {
                  console.error('[PayPal] Error', err);
                  toast.error('No pudimos procesar la donación. Intenta de nuevo.');
                }}
                onCancel={() => toast.info('Donación cancelada')}
              />
            </PayPalScriptProvider>
          ) : (
            <p className="text-xs text-muted-foreground text-center">Ingresa un monto válido (mínimo $1).</p>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        Pagos procesados de forma segura por PayPal. No almacenamos información de tu tarjeta.
      </p>
    </div>
  );
}