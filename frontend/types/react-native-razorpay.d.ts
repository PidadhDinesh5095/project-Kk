declare module 'react-native-razorpay' {
  type RazorpayCheckoutOptions = {
    key: string;
    amount: string;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    timeout: number;
    prefill?: {
      name?: string;
      email?: string;
      contact?: string;
    };
    theme?: { color: string };
  };

  type RazorpayPaymentResult = {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };

  const RazorpayCheckout: {
    open(options: RazorpayCheckoutOptions): Promise<RazorpayPaymentResult>;
  };

  export default RazorpayCheckout;
}
