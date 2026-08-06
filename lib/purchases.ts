import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type PurchasesOffering,
  type PurchasesPackage,
  type CustomerInfo,
} from 'react-native-purchases';
import { Platform } from 'react-native';

const RC_KEY = Platform.OS === 'ios'
  ? (process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '')
  : (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '');

let _ready = false;

export function initPurchases(userId?: string) {
  if (!RC_KEY) return;
  try {
    Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey: RC_KEY, appUserID: userId });
    _ready = true;
  } catch {
    // Native module unavailable (Expo Go)
  }
}

export async function getDefaultOffering(): Promise<PurchasesOffering | null> {
  if (!_ready) return null;
  try {
    const { current } = await Purchases.getOfferings();
    return current;
  } catch {
    return null;
  }
}

export async function doPurchasePackage(pkg: PurchasesPackage) {
  return Purchases.purchasePackage(pkg);
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!_ready) return null;
  try {
    return await Purchases.restorePurchases();
  } catch {
    return null;
  }
}

export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!_ready) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

const ENTITLEMENT_ID = 'Attiks Pro';

export function hasPremium(info: CustomerInfo | null): boolean {
  return !!info?.entitlements.active[ENTITLEMENT_ID];
}

export { PURCHASES_ERROR_CODE };
export type { PurchasesOffering, PurchasesPackage, CustomerInfo };
