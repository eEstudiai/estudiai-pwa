import { supabase } from "./supabase";

export const ESTUDIAI_PLUS_PRODUCT_ID = "estudiai_plus";

export type EstudaIAPlan = "free" | "plus";

export type SubscriptionVerificationResult = {
  success: boolean;
  plan?: EstudaIAPlan;
  status?: string;
  productId?: string;
  subscriptionState?: string;
  autoRenewing?: boolean;
  expiresAt?: string;
  error?: string;
};

export async function verifyGooglePlaySubscription(
  purchaseToken: string,
): Promise<SubscriptionVerificationResult> {
  const token = purchaseToken.trim();

  if (!token) {
    return {
      success: false,
      error: "purchase_token_required",
    };
  }

  const { data, error } = await supabase.functions.invoke(
    "verify-google-play-subscription",
    {
      body: {
        purchaseToken: token,
        productId: ESTUDIAI_PLUS_PRODUCT_ID,
      },
    },
  );

  if (error) {
    console.error(
      "Erro ao verificar assinatura Google Play:",
      error,
    );

    return {
      success: false,
      error: "subscription_verification_failed",
    };
  }

  if (!data?.success) {
    return {
      success: false,
      error: data?.error ?? "subscription_verification_failed",
    };
  }

  return {
    success: true,
    plan: data.plan,
    status: data.status,
    productId: data.productId,
    subscriptionState: data.subscriptionState,
    autoRenewing: data.autoRenewing,
    expiresAt: data.expiresAt,
  };
}