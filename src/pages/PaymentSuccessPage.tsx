import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PaymentSuccessPage() {
  const location = useLocation();
  const amount = (location.state as { amount?: number } | null)?.amount;

  return (
    <div className="container px-4 py-12 max-w-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-8 text-center"
      >
        <div className="w-20 h-20 mx-auto rounded-full gold-gradient flex items-center justify-center mb-5">
          <CheckCircle2 className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold font-display text-foreground mb-2">
          ¡Gracias por tu donación!
        </h1>
        <p className="text-muted-foreground mb-6">
          {amount
            ? `Hemos recibido tu aporte de $${amount.toFixed(2)} USD. Tu apoyo nos ayuda a seguir mejorando Worship Transpose.`
            : 'Hemos recibido tu aporte. Tu apoyo nos ayuda a seguir mejorando Worship Transpose.'}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gold-gradient text-primary-foreground text-sm font-semibold shadow-md hover:opacity-90 transition-all"
        >
          <Heart className="w-4 h-4" fill="currentColor" /> Volver al inicio
        </Link>
      </motion.div>
    </div>
  );
}