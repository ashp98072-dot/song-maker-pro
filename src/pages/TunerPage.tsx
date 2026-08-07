import { Navigate } from 'react-router-dom';

/** Afinador vive en el hub /acordes?tab=afinador */
export default function TunerPage() {
  return <Navigate to="/acordes?tab=afinador" replace />;
}
