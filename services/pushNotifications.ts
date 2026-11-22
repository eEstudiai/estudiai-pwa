import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { supabase } from "./supabase";

const CHANNEL_ID = "estudiai-promotional";

export const PROMOTIONAL_INVITATION_VERSION = "v1";
/**
 * Consulta a preferência promocional da conta autenticada.
 */
export async function getPromotionalPreference(): Promise<boolean> {
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError) throw authError;

  if (!authData.user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data, error } = await supabase
    .from("user_notification_preferences")
    .select("promotional_opt_in")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (error) throw error;

  return data?.promotional_opt_in === true;
}

function getProjectId(): string {
  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;

  if (!projectId) {
    throw new Error("Não foi possível identificar o projectId do Expo.");
  }

  return projectId;
}

/**
 * Consulta se a conta ainda deve receber o convite promocional.
 */
export async function shouldShowPromotionalInvitation(
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_notification_preferences")
    .select(
      "promotional_opt_in, revoked_at, invitation_handled_version",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) return true;

  if (
    data.promotional_opt_in === true ||
    data.revoked_at !== null
  ) {
    return false;
  }

  return (
    data.invitation_handled_version !==
    PROMOTIONAL_INVITATION_VERSION
  );
}

/**
 * Registra no backend que o usuário respondeu ao convite.
 */
export async function markPromotionalInvitationHandled(): Promise<void> {
  const { error } = await supabase.functions.invoke(
    "register-push-device",
    {
      body: {
        action: "mark_invitation_handled",
        version: PROMOTIONAL_INVITATION_VERSION,
      },
    },
  );

  if (error) throw error;
}

/**
 * Solicita permissão Android e registra o dispositivo
 * somente após o consentimento explícito.
 */
export async function enablePromotionalNotifications(): Promise<void> {
  if (Platform.OS !== "android") {
    throw new Error(
      "Notificações promocionais estão disponíveis inicialmente apenas no Android.",
    );
  }

  if (!Device.isDevice) {
    throw new Error(
      "É necessário utilizar um dispositivo físico Android.",
    );
  }

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Novidades e ofertas do EstudaIA",
    importance: Notifications.AndroidImportance.DEFAULT,
  });

  let permission = await Notifications.getPermissionsAsync();

  if (!permission.granted) {
    permission = await Notifications.requestPermissionsAsync();
  }

  if (!permission.granted) {
    throw new Error(
      "A permissão de notificações não foi concedida no Android.",
    );
  }

  const tokenResult = await Notifications.getExpoPushTokenAsync({
    projectId: getProjectId(),
  });

  const { error } = await supabase.functions.invoke(
    "register-push-device",
    {
      body: {
        action: "enable",
        expoPushToken: tokenResult.data,
        platform: "android",
      },
    },
  );

  if (error) throw error;
}

/**
 * Revoga o consentimento promocional da conta.
 */
export async function disablePromotionalNotifications(): Promise<void> {
  const { error } = await supabase.functions.invoke(
    "register-push-device",
    {
      body: {
        action: "disable",
      },
    },
  );

  if (error) throw error;
}

