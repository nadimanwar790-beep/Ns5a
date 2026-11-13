import { saveFee } from "../school-firebase";
import type { MonthlyFee } from "../school-types";

export interface PublicRazorpayConfig {
  ok: boolean;
  schoolId: string;
  enabled: boolean;
  keyId: string;
  mode: "test" | "live";
  hasKeySecret: boolean;
  hasWebhookSecret: boolean;
  webhookUrl: string;
  updatedAt?: string | null;
}

let razorpayScriptPromise: Promise<boolean> | null = null;

export function loadRazorpayCheckoutScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as any).Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean((window as any).Razorpay)), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(Boolean((window as any).Razorpay));
    script.onerror = () => {
      razorpayScriptPromise = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

export async function fetchSchoolRazorpayConfig(
  schoolId: string
): Promise<PublicRazorpayConfig | null> {
  if (!schoolId) return null;
  try {
    const res = await fetch(
      `/api/razorpay/config?schoolId=${encodeURIComponent(schoolId)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.ok ? (data as PublicRazorpayConfig) : null;
  } catch {
    return null;
  }
}

export interface StartStudentFeeCheckoutParams {
  schoolId: string;
  schoolName: string;
  student: {
    id: string;
    name: string;
    classId?: string;
    className?: string;
    rollNo?: string;
    admissionNo?: string;
    phone?: string;
    email?: string;
  };
  fee: any;
  payableAmount: number;
  monthLabel: string;
  onSuccess: (result: { receiptNo: string; paymentId: string; fee?: MonthlyFee }) => void;
  onError: (msg: string) => void;
  onDismiss?: () => void;
}

export async function startStudentRazorpayFeeCheckout(
  params: StartStudentFeeCheckoutParams
): Promise<void> {
  const {
    schoolId,
    schoolName,
    student,
    fee,
    payableAmount,
    monthLabel,
    onSuccess,
    onError,
    onDismiss,
  } = params;

  try {
    const loaded = await loadRazorpayCheckoutScript();
    if (!loaded || !(window as any).Razorpay) {
      onError("Razorpay payment script load nahi ho paaya. Internet check karein.");
      return;
    }

    const month = String(fee?.month || "2026-04");
    const orderRes = await fetch("/api/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId,
        schoolName,
        studentId: student.id,
        studentName: student.name,
        classId: student.classId || fee?.classId || "",
        className: student.className || fee?.className || "",
        rollNo: student.rollNo || fee?.rollNo || "",
        admissionNo: student.admissionNo || fee?.admissionNo || "",
        sessionId: fee?.sessionId || "",
        month,
        monthLabel,
        amount: payableAmount,
        feeId: fee?.id || `${student.id}_${month}`,
        feeItems: Array.isArray(fee?.feeItems) ? fee.feeItems : [],
      }),
    });

    const orderData = await orderRes.json().catch(() => ({}));
    if (!orderRes.ok || !orderData?.ok || !orderData?.orderId) {
      onError(orderData?.error || "Payment order nahi ban paaya.");
      return;
    }

    const RazorpayCtor = (window as any).Razorpay;
    const rzp = new RazorpayCtor({
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency || "INR",
      name: schoolName || "School Fee Desk",
      description: `${monthLabel} Fee • ${student.name}${student.rollNo ? ` (Roll ${student.rollNo})` : ""}`,
      order_id: orderData.orderId,
      prefill: {
        name: student.name || "",
        contact: student.phone ? String(student.phone).replace(/\D/g, "").slice(-10) : "",
        email: student.email || "",
      },
      notes: {
        schoolId,
        studentId: student.id,
        month,
      },
      theme: {
        color: "#4f46e5",
      },
      modal: {
        ondismiss: () => {
          onDismiss?.();
        },
      },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const verifyRes = await fetch("/api/razorpay/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              schoolId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json().catch(() => ({}));
          if (!verifyRes.ok || !verifyData?.ok) {
            onError(
              verifyData?.error ||
                "Payment hua par verification fail hua — webhook auto-sync kuch seconds me check karega."
            );
            return;
          }

          if (verifyData.fee) {
            await saveFee(verifyData.fee).catch(() => {});
          }

          onSuccess({
            receiptNo: verifyData.receiptNo || `RZP-${response.razorpay_payment_id.slice(-6).toUpperCase()}`,
            paymentId: response.razorpay_payment_id,
            fee: verifyData.fee,
          });
        } catch (err: any) {
          onError(err?.message || "Payment verification error");
        }
      },
    });

    rzp.on("payment.failed", (resp: any) => {
      const reason =
        resp?.error?.description || resp?.error?.reason || "Payment unsuccessful";
      onError(reason);
    });

    rzp.open();
  } catch (err: any) {
    onError(err?.message || "Online payment start karne me truti aayi");
  }
}

export interface StoreCheckoutLineItem {
  itemId: string;
  itemName: string;
  category?: string;
  sizeOrVariant?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface StartStudentStoreCheckoutParams {
  schoolId: string;
  schoolName: string;
  student: {
    id: string;
    name: string;
    classId?: string;
    className?: string;
    rollNo?: string;
    admissionNo?: string;
    phone?: string;
    email?: string;
  };
  items: StoreCheckoutLineItem[];
  totalAmount: number;
  reservationId?: string;
  onSuccess: (result: {
    receiptNo: string;
    paymentId: string;
    orderId: string;
    sale?: import("../school-types").StoreSaleRecord;
  }) => void;
  onError: (msg: string) => void;
  onDismiss?: () => void;
}

export async function startStudentRazorpayStoreCheckout(
  params: StartStudentStoreCheckoutParams
): Promise<void> {
  const {
    schoolId,
    schoolName,
    student,
    items,
    totalAmount,
    reservationId,
    onSuccess,
    onError,
    onDismiss,
  } = params;

  try {
    const loaded = await loadRazorpayCheckoutScript();
    if (!loaded || !(window as any).Razorpay) {
      onError("Razorpay payment script load nahi ho paaya. Internet check karein.");
      return;
    }

    const orderRes = await fetch("/api/razorpay/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purpose: "store_order",
        schoolId,
        schoolName,
        studentId: student.id,
        studentName: student.name,
        classId: student.classId || "",
        className: student.className || "",
        rollNo: student.rollNo || "",
        admissionNo: student.admissionNo || "",
        phone: student.phone || "",
        month: new Date().toISOString().slice(0, 7),
        monthLabel: "School Store Order",
        amount: totalAmount,
        storeItems: items,
        reservationId,
      }),
    });

    const orderData = await orderRes.json().catch(() => ({}));
    if (!orderRes.ok || !orderData?.ok || !orderData?.orderId) {
      onError(orderData?.error || "Store payment order nahi ban paaya.");
      return;
    }

    const itemDesc = items.map((i) => `${i.itemName} ×${i.quantity}`).join(", ").slice(0, 120);
    const RazorpayCtor = (window as any).Razorpay;
    const rzp = new RazorpayCtor({
      key: orderData.keyId,
      amount: orderData.amount,
      currency: orderData.currency || "INR",
      name: schoolName || "School Store",
      description: `Store: ${itemDesc || "Items"} • ${student.name}`,
      order_id: orderData.orderId,
      prefill: {
        name: student.name || "",
        contact: student.phone ? String(student.phone).replace(/\D/g, "").slice(-10) : "",
        email: student.email || "",
      },
      notes: {
        schoolId,
        studentId: student.id,
        purpose: "store_order",
        reservationId: reservationId || "",
      },
      theme: {
        color: "#059669",
      },
      modal: {
        ondismiss: () => {
          onDismiss?.();
        },
      },
      handler: async (response: {
        razorpay_order_id: string;
        razorpay_payment_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const verifyRes = await fetch("/api/razorpay/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              schoolId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const verifyData = await verifyRes.json().catch(() => ({}));
          if (!verifyRes.ok || !verifyData?.ok) {
            onError(
              verifyData?.error ||
                "Payment hua par verification fail hua — webhook auto-sync kuch seconds me check karega."
            );
            return;
          }

          onSuccess({
            receiptNo:
              verifyData.receiptNo ||
              `STR-ONL-${response.razorpay_payment_id.slice(-6).toUpperCase()}`,
            paymentId: response.razorpay_payment_id,
            orderId: response.razorpay_order_id,
            sale: verifyData.sale,
          });
        } catch (err: any) {
          onError(err?.message || "Payment verification error");
        }
      },
    });

    rzp.on("payment.failed", (resp: any) => {
      const reason =
        resp?.error?.description || resp?.error?.reason || "Payment unsuccessful";
      onError(reason);
    });

    rzp.open();
  } catch (err: any) {
    onError(err?.message || "Online payment start karne me truti aayi");
  }
}

