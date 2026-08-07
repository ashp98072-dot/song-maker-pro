import { Navigate } from 'react-router-dom';

/** Test de registro vive en el hub /acordes?tab=registro */
export default function VocalRangeTestPage() {
  return <Navigate to="/acordes?tab=registro" replace />;
}
