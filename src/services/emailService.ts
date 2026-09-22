import emailjs from '@emailjs/browser';

export interface EmailOtpParams {
  name: string;
  email: string;
  otp: string;
  // Optional metadata
  assigned_agent?: string;
  scheme_name?: string;
  to_name?: string;
  to_email?: string;
  otp_code?: string;
}

export interface EmailSendResult {
  sent: boolean;
  status: number | string;
  message: string;
  provider: 'emailjs' | 'simulated';
}

// Generate a random 6-digit numeric OTP
export function generateRandomOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Retrieve public configuration from Vite environment variables or localStorage overrides
export const getEmailJsConfig = () => {
  const serviceId =
    (typeof window !== 'undefined' && localStorage.getItem('scheme_seva_emailjs_service_id')) ||
    import.meta.env.VITE_EMAILJS_SERVICE_ID ||
    '';
  const templateId =
    (typeof window !== 'undefined' && localStorage.getItem('scheme_seva_emailjs_template_id')) ||
    import.meta.env.VITE_EMAILJS_TEMPLATE_ID ||
    'template_8fv6btc';
  const publicKey =
    (typeof window !== 'undefined' && localStorage.getItem('scheme_seva_emailjs_public_key')) ||
    import.meta.env.VITE_EMAILJS_PUBLIC_KEY ||
    '';

  const isPlaceholder = serviceId === 'YOUR_SERVICE_ID' || publicKey === 'YOUR_PUBLIC_KEY';
  const isConfigured = Boolean(serviceId && templateId && publicKey && !isPlaceholder);

  return { serviceId, templateId, publicKey, isConfigured };
};

/**
 * Save user custom EmailJS configuration to browser local storage if entered in settings
 */
export const saveEmailJsConfig = (serviceId: string, templateId: string, publicKey: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('scheme_seva_emailjs_service_id', serviceId.trim());
    localStorage.setItem('scheme_seva_emailjs_template_id', templateId.trim());
    localStorage.setItem('scheme_seva_emailjs_public_key', publicKey.trim());
  }
};

/**
 * Sends real email OTP via EmailJS using exact template variables:
 * - name: User full name
 * - otp: 6-digit random OTP
 */
export async function sendOtpEmail(params: EmailOtpParams): Promise<EmailSendResult> {
  const config = getEmailJsConfig();
  const recipientName = params.name || params.to_name || 'Citizen';
  const recipientEmail = params.email || params.to_email || '';
  const otpCode = params.otp || params.otp_code || generateRandomOtp();

  if (config.isConfigured) {
    try {
      const templateParams = {
        name: recipientName,
        otp: otpCode,
        to_name: recipientName,
        to_email: recipientEmail,
        email: recipientEmail
      };

      const response = await emailjs.send(
        config.serviceId,
        config.templateId,
        templateParams,
        config.publicKey
      );

      return {
        sent: true,
        status: response.status,
        message: `Verification OTP dispatched to ${recipientEmail} via EmailJS.`,
        provider: 'emailjs'
      };
    } catch (err: any) {
      console.warn('EmailJS live send warning:', err);
      return {
        sent: false,
        status: 'EMAILJS_ERROR',
        message: `EmailJS send error (${err?.text || err?.message || 'Check Service ID/Template/Key'}). OTP rendered below for testing.`,
        provider: 'simulated'
      };
    }
  }

  // Fallback transparent sandbox mode
  return {
    sent: true,
    status: 200,
    message: `Verification OTP sent to ${recipientEmail} (Sandbox mode: configure VITE_EMAILJS_SERVICE_ID and VITE_EMAILJS_PUBLIC_KEY for live delivery).`,
    provider: 'simulated'
  };
}

