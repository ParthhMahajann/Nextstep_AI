/**
 * Signup page - wraps SignupWizard
 */

import { useNavigate } from 'react-router-dom';
import { SignupWizard } from '../components/SignupWizard';

export function SignupPage() {
    const navigate = useNavigate();

    const handleComplete = () => {
        navigate('/discover');
    };

    return <SignupWizard onComplete={handleComplete} />;
}
