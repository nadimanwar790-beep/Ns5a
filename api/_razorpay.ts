import crypto from "crypto";

const RTDB_BASE_URL =
  process.env.FIREBASE_DATABASE_URL ||
  "https://nst2512-6a2e4-default-rtdb.asia-southeast1.firebasedatabase.app";

export interface RazorpaySchoolConfig {
  schoolId: string;
  enabled: boolean;
  keyId: string;
  keySecret: string;
  webhookSecret: string;
  mode: "test" | "live";
  updatedAt: string;
  updatedBy?: string;
}

export interface RazorpayOrderRecord {
  orderId: string;
  purpose?: "fee_payment" | "store_order" | "admission_fee";
  schoolId: string;
  schoolName?: string;
  studentId: string;
  studentName: string;
  applicationId?: string;
  applicationNo?: string;
  classId?: string;
  className?: string;
  rollNo?: string;
  admissionNo?: string;
  phone?: string;
  sessionId?: string;
  month: string;
  monthLabel: string;
  feeId: string;
  expectedAmount: number;
  expectedPaise: number;
  feeItems?: any[];
  storeItems?: {
    itemId: string;
    itemName: string;
    category?: string;
    sizeOrVariant?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  reservationId?: string;
  status: "CREATED" | "PAID";
  createdAt: string;
  paidAt?: string;
  paymentId?: string;
  receiptNo?: string;
  method?: string;
  verifiedVia?: "checkout" | "webhook";
}

function cleanRtdbKey(raw: string): string {
  return String(raw || "").trim().replace(/[.#$[\]/]/g, "_");
}

async function rtdbGet<T = any>(rtdbPath: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${RTDB_BASE_URL}/${rtdbPath}.json`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function rtdbPut(rtdbPath: string, payload: unknown): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${RTDB_BASE_URL}/${rtdbPath}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

async function rtdbPatch(rtdbPath: string, payload: unknown): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${RTDB_BASE_URL}/${rtdbPath}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

function timingSafeHexEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(String(a || "").trim(), "utf8");
    const bufB = Buffer.from(String(b || "").trim(), "utf8");
    if (bufA.length === 0 || bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export async function getSchoolRazorpayConfigRaw(
  schoolId: string
): Promise<RazorpaySchoolConfig | null> {
  if (!schoolId) return null;
  const safeId = cleanRtdbKey(schoolId);
  const cfg = await rtdbGet<RazorpaySchoolConfig>(
    `school_payment_configs/${safeId}`
  );
  return cfg || null;
}

export async function getPublicRazorpayConfig(
  schoolId: string,
  originBase: string
) {
  const cfg = await getSchoolRazorpayConfigRaw(schoolId);
  const keyId = String(cfg?.keyId || "").trim();
  const mode: "test" | "live" = keyId.startsWith("rzp_live_") ? "live" : "test";
  const cleanOrigin = String(originBase || "").replace(/\/+$/, "");
  const webhookUrl = `${cleanOrigin}/api/razorpay/webhook?schoolId=${encodeURIComponent(
    schoolId
  )}`;

  return {
    ok: true,
    schoolId,
    enabled: Boolean(cfg?.enabled && keyId && cfg?.keySecret),
    keyId,
    mode,
    hasKeySecret: Boolean(cfg?.keySecret),
    hasWebhookSecret: Boolean(cfg?.webhookSecret),
    webhookUrl,
    updatedAt: cfg?.updatedAt || null,
  };
}

export async function saveSchoolRazorpayConfig(input: {
  schoolId: string;
  enabled?: boolean;
  keyId?: string;
  keySecret?: string;
  webhookSecret?: string;
  updatedBy?: string;
}) {
  const schoolId = String(input.schoolId || "").trim();
  if (!schoolId) {
    return { status: 400, body: { ok: false, error: "schoolId is required" } };
  }
  const safeId = cleanRtdbKey(schoolId);
  const existing = await getSchoolRazorpayConfigRaw(schoolId);

  const nextKeyId =
    input.keyId !== undefined
      ? String(input.keyId || "").trim()
      : String(existing?.keyId || "").trim();
  const nextKeySecret =
    input.keySecret && String(input.keySecret).trim()
      ? String(input.keySecret).trim()
      : String(existing?.keySecret || "").trim();
  const nextWebhookSecret =
    input.webhookSecret && String(input.webhookSecret).trim()
      ? String(input.webhookSecret).trim()
      : String(existing?.webhookSecret || "").trim();

  if (nextKeyId && !/^rzp_(test|live)_[A-Za-z0-9]+$/.test(nextKeyId)) {
    return {
      status: 400,
      body: {
        ok: false,
        error:
          "Invalid Razorpay Key ID format (rzp_test_... ya rzp_live_... hona chahiye)",
      },
    };
  }

  const enabled =
    typeof input.enabled === "boolean"
      ? input.enabled
      : Boolean(existing?.enabled ?? true);

  if (enabled && (!nextKeyId || !nextKeySecret)) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "Razorpay enable karne ke liye Key ID aur Key Secret dono zaroori hain",
      },
    };
  }

  const mode: "test" | "live" = nextKeyId.startsWith("rzp_live_")
    ? "live"
    : "test";

  const payload: RazorpaySchoolConfig = {
    schoolId,
    enabled,
    keyId: nextKeyId,
    keySecret: nextKeySecret,
    webhookSecret: nextWebhookSecret,
    mode,
    updatedAt: new Date().toISOString(),
    updatedBy: input.updatedBy || "school_admin",
  };

  const saved = await rtdbPut(`school_payment_configs/${safeId}`, payload);
  if (!saved) {
    return {
      status: 500,
      body: { ok: false, error: "Failed to persist Razorpay config in database" },
    };
  }

  return {
    status: 200,
    body: {
      ok: true,
      enabled,
      keyId: nextKeyId,
      mode,
      hasKeySecret: Boolean(nextKeySecret),
      hasWebhookSecret: Boolean(nextWebhookSecret),
    },
  };
}

export async function testSchoolRazorpayConnection(schoolId: string) {
  const cfg = await getSchoolRazorpayConfigRaw(schoolId);
  if (!cfg?.keyId || !cfg?.keySecret) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "Pehle Razorpay Key ID aur Key Secret save karein",
      },
    };
  }

  try {
    const authHeader = Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString(
      "base64"
    );
    const res = await fetch("https://api.razorpay.com/v1/orders?count=1", {
      method: "GET",
      headers: { Authorization: `Basic ${authHeader}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        status: 400,
        body: {
          ok: false,
          error:
            data?.error?.description ||
            `Razorpay rejected keys (HTTP ${res.status})`,
        },
      };
    }
    return {
      status: 200,
      body: {
        ok: true,
        mode: cfg.keyId.startsWith("rzp_live_") ? "live" : "test",
        hasWebhookSecret: Boolean(cfg.webhookSecret),
        message: "Razorpay API keys verified successfully!",
      },
    };
  } catch (err: any) {
    return {
      status: 502,
      body: {
        ok: false,
        error: err?.message || "Could not reach Razorpay API",
      },
    };
  }
}

export async function createSchoolRazorpayOrder(input: {
  schoolId: string;
  schoolName?: string;
  studentId: string;
  studentName: string;
  applicationId?: string;
  applicationNo?: string;
  classId?: string;
  className?: string;
  rollNo?: string;
  admissionNo?: string;
  phone?: string;
  sessionId?: string;
  month?: string;
  monthLabel?: string;
  amount: number;
  feeId?: string;
  feeItems?: any[];
  purpose?: "fee_payment" | "store_order" | "admission_fee";
  storeItems?: any[];
  reservationId?: string;
}) {
  const schoolId = String(input.schoolId || "").trim();
  const studentId = String(input.studentId || "").trim();
  const purpose: "fee_payment" | "store_order" | "admission_fee" =
    input.purpose === "store_order"
      ? "store_order"
      : input.purpose === "admission_fee"
      ? "admission_fee"
      : "fee_payment";
  const month = String(input.month || new Date().toISOString().slice(0, 7)).trim();
  const amount = Math.round(Number(input.amount || 0));

  if (!schoolId || !studentId || (purpose === "fee_payment" && !input.month)) {
    return {
      status: 400,
      body: { ok: false, error: "schoolId, studentId aur month zaroori hain" },
    };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      status: 400,
      body: { ok: false, error: "Payable amount ₹1 se adhik hona chahiye" },
    };
  }
  if (purpose === "store_order" && (!Array.isArray(input.storeItems) || input.storeItems.length === 0)) {
    return {
      status: 400,
      body: { ok: false, error: "Kam se kam ek store item zaroori hai" },
    };
  }

  const cfg = await getSchoolRazorpayConfigRaw(schoolId);
  if (!cfg?.enabled || !cfg?.keyId || !cfg?.keySecret) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "Is school ke liye Razorpay online payment abhi active nahi hai",
      },
    };
  }

  const feeKey = `${studentId}_${month}`;
  if (purpose === "fee_payment") {
    // Prevent duplicate payment if this exact student+month fee is already fully paid
    const existingFee = await rtdbGet<any>(
      `schools/${cleanRtdbKey(schoolId)}/fees/${cleanRtdbKey(feeKey)}`
    );
    if (
      existingFee &&
      existingFee.paid === true &&
      Number(existingFee.balanceDue ?? 0) <= 0
    ) {
      return {
        status: 409,
        body: {
          ok: false,
          error: "Is mahine ki fee pehle hi jama ho chuki hai!",
        },
      };
    }
  }

  const expectedPaise = amount * 100;
  const receiptTag =
    purpose === "store_order"
      ? `NSTA-STR-${studentId.slice(-5)}-${Date.now().toString(36).slice(-5)}`.slice(0, 40)
      : purpose === "admission_fee"
      ? `NSTA-ADM-${(input.applicationNo || studentId).replace(/[^a-zA-Z0-9]/g, "").slice(-6)}-${Date.now().toString(36).slice(-4)}`.slice(0, 40)
      : `NSTA-${studentId.slice(-6)}-${month.replace(/[^0-9]/g, "")}-${Date.now()
          .toString(36)
          .slice(-4)}`.slice(0, 40);

  const authHeader = Buffer.from(`${cfg.keyId}:${cfg.keySecret}`).toString(
    "base64"
  );

  const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: expectedPaise,
      currency: "INR",
      receipt: receiptTag,
      notes: {
        schoolId,
        studentId,
        studentName: String(input.studentName || "Student").slice(0, 80),
        purpose,
        applicationId: input.applicationId || "",
        applicationNo: input.applicationNo || "",
        month,
        feeId:
          purpose === "store_order"
            ? (input.reservationId || receiptTag)
            : purpose === "admission_fee"
            ? (input.applicationId || receiptTag)
            : (input.feeId || feeKey),
        reservationId: input.reservationId || "",
        expectedPaise: String(expectedPaise),
      },
    }),
  });

  const rzpOrder = (await rzpRes.json().catch(() => ({}))) as any;
  if (!rzpRes.ok || !rzpOrder?.id) {
    return {
      status: 502,
      body: {
        ok: false,
        error:
          rzpOrder?.error?.description ||
          "Razorpay order creation failed. Keys check karein.",
      },
    };
  }

  const orderRecord: RazorpayOrderRecord = {
    orderId: rzpOrder.id,
    purpose,
    schoolId,
    schoolName: input.schoolName || "",
    studentId,
    studentName: input.studentName || "Student",
    applicationId: input.applicationId || undefined,
    applicationNo: input.applicationNo || undefined,
    classId: input.classId || "",
    className: input.className || "",
    rollNo: input.rollNo || "",
    admissionNo: input.admissionNo || "",
    phone: input.phone || "",
    sessionId: input.sessionId || "",
    month,
    monthLabel:
      input.monthLabel ||
      (purpose === "store_order"
        ? "School Store Order"
        : purpose === "admission_fee"
        ? "Online Admission Fee"
        : month),
    feeId:
      purpose === "store_order"
        ? (input.reservationId || rzpOrder.id)
        : purpose === "admission_fee"
        ? (input.applicationId || rzpOrder.id)
        : (input.feeId || feeKey),
    expectedAmount: amount,
    expectedPaise,
    feeItems: Array.isArray(input.feeItems) ? input.feeItems : undefined,
    storeItems: purpose === "store_order" && Array.isArray(input.storeItems) ? input.storeItems : undefined,
    reservationId: input.reservationId ? String(input.reservationId) : undefined,
    status: "CREATED",
    createdAt: new Date().toISOString(),
  };

  await rtdbPut(`school_payment_orders/${cleanRtdbKey(rzpOrder.id)}`, orderRecord);

  return {
    status: 200,
    body: {
      ok: true,
      orderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency || "INR",
      keyId: cfg.keyId,
      mode: cfg.keyId.startsWith("rzp_live_") ? "live" : "test",
    },
  };
}

async function finalizeRazorpayOrderPaid(params: {
  order: RazorpayOrderRecord;
  paymentId: string;
  method?: string;
  verifiedVia: "checkout" | "webhook";
  onNotify?: (payload: {
    schoolId: string;
    studentId: string;
    studentName: string;
    amount: number;
    monthLabel: string;
    receiptNo: string;
    purpose?: "fee_payment" | "store_order" | "admission_fee";
  }) => Promise<void> | void;
}): Promise<{ duplicate: boolean; receiptNo: string; fee?: any; sale?: any }> {
  const { order, paymentId, method, verifiedVia, onNotify } = params;
  const safeOrderKey = cleanRtdbKey(order.orderId);
  const safeSchool = cleanRtdbKey(order.schoolId);

  if (order.status === "PAID") {
    if (order.purpose === "store_order") {
      const existingSale = await rtdbGet<any>(
        `schools/${safeSchool}/store_sales/${cleanRtdbKey(`sale-rzp-${order.orderId}`)}`
      );
      return {
        duplicate: true,
        receiptNo: order.receiptNo || existingSale?.receiptNo || `STR-ONL-${paymentId.slice(-6).toUpperCase()}`,
        sale: existingSale || undefined,
      };
    }
    if (order.purpose === "admission_fee") {
      return {
        duplicate: true,
        receiptNo: order.receiptNo || `ADM-ONL-${paymentId.replace(/^pay_/, "").slice(0, 8).toUpperCase()}`,
      };
    }
    const existingFee = await rtdbGet<any>(
      `schools/${safeSchool}/fees/${cleanRtdbKey(
        `${order.studentId}_${order.month}`
      )}`
    );
    return {
      duplicate: true,
      receiptNo: order.receiptNo || existingFee?.receiptNo || `RZP-${paymentId.slice(-6).toUpperCase()}`,
      fee: existingFee,
    };
  }

  const paidAt = new Date().toISOString();

  // ── BRANCH A0: ONLINE ADMISSION FEE PAYMENT (Auto-Approve Admission) ────
  if (order.purpose === "admission_fee") {
    const receiptNo = `ADM-ONL-${paymentId.replace(/^pay_/, "").slice(0, 8).toUpperCase()}`;
    const admPayKey = cleanRtdbKey(order.applicationId || order.orderId);

    await rtdbPut(`schools/${safeSchool}/admission_payments/${admPayKey}`, {
      orderId: order.orderId,
      paymentId,
      receiptNo,
      applicationId: order.applicationId || order.studentId,
      applicationNo: order.applicationNo || order.admissionNo || "",
      studentName: order.studentName,
      classId: order.classId || "",
      className: order.className || "",
      amount: Number(order.expectedAmount || 0),
      method: method || "online",
      verifiedVia,
      paidAt,
    });

    await rtdbPatch(`school_payment_orders/${safeOrderKey}`, {
      status: "PAID",
      paidAt,
      paymentId,
      receiptNo,
      method: method || "online",
      verifiedVia,
    });

    const msgId = `rzp-adm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await rtdbPut(`schools/${safeSchool}/nsta_messages/${msgId}`, {
      id: msgId,
      schoolId: order.schoolId,
      threadType: "SCHOOL_DESK",
      studentId: order.studentId,
      studentName: order.studentName,
      senderId: "school_admin",
      senderName: "School Admissions & Online Fee Desk",
      senderRole: "ADMIN",
      text: `🎓 Online Admission Payment Received! ${order.studentName} (${order.className || "Class"}) — App No: ${order.applicationNo || order.studentId} ke ₹${Number(order.expectedAmount || 0).toLocaleString("en-IN")} Razorpay se verify ho gaye hain. Receipt: ${receiptNo}.`,
      createdAt: paidAt,
      status: "delivered",
    });

    if (onNotify) {
      try {
        await onNotify({
          schoolId: order.schoolId,
          studentId: order.studentId,
          studentName: order.studentName,
          amount: order.expectedAmount,
          monthLabel: order.monthLabel || "Online Admission Fee",
          receiptNo,
          purpose: "admission_fee",
        });
      } catch {}
    }

    return { duplicate: false, receiptNo };
  }

  // ── BRANCH A: SCHOOL STORE ORDER (Uniform / Books / Stationery) ────────
  if (order.purpose === "store_order") {
    const receiptNo = `STR-ONL-${paymentId.replace(/^pay_/, "").slice(0, 8).toUpperCase()}`;
    const saleId = `sale-rzp-${cleanRtdbKey(order.orderId)}`;
    const saleItems = (order.storeItems || []).map((it: any) => ({
      itemId: String(it.itemId || ""),
      itemName: it.sizeOrVariant
        ? `${it.itemName} (${it.sizeOrVariant})`
        : String(it.itemName || "Store Item"),
      quantity: Number(it.quantity || 1),
      unitPrice: Number(it.unitPrice || 0),
      subtotal: Number(it.subtotal || Number(it.unitPrice || 0) * Number(it.quantity || 1)),
    }));

    const saleRecord = {
      id: saleId,
      schoolId: order.schoolId,
      receiptNo,
      studentId: order.studentId,
      studentName: order.studentName,
      className: order.className || "",
      rollNo: order.rollNo || "",
      reservationId: order.reservationId || undefined,
      items: saleItems,
      totalAmount: Number(order.expectedAmount || 0),
      paymentMode: "nsta_online" as const,
      date: paidAt.slice(0, 10),
      soldBy: `NSTA Online (${method ? String(method).toUpperCase() : "Razorpay"})`,
      razorpayOrderId: order.orderId,
      razorpayPaymentId: paymentId,
      verifiedViaWebhook: verifiedVia === "webhook",
      updatedAt: paidAt,
    };

    // 1. Write sale record to RTDB
    await rtdbPut(`schools/${safeSchool}/store_sales/${cleanRtdbKey(saleId)}`, saleRecord);

    // 2. Mark reservation paid & collected if linked to a reservation
    if (order.reservationId) {
      await rtdbPatch(
        `schools/${safeSchool}/store_reservations/${cleanRtdbKey(order.reservationId)}`,
        {
          id: order.reservationId,
          schoolId: order.schoolId,
          studentId: order.studentId,
          studentName: order.studentName,
          className: order.className || "",
          rollNo: order.rollNo || "",
          status: "collected",
          collectedAt: paidAt,
          collectedBy: "NSTA Online (Razorpay)",
          paymentMode: "nsta_online",
          razorpayOrderId: order.orderId,
          razorpayPaymentId: paymentId,
          verifiedViaWebhook: verifiedVia === "webhook",
          paidAt,
          receiptNo,
        }
      );
    }

    // 3. Lock order as PAID
    await rtdbPatch(`school_payment_orders/${safeOrderKey}`, {
      status: "PAID",
      paidAt,
      paymentId,
      receiptNo,
      method: method || "online",
      verifiedVia,
    });

    // 4. Send NSTA Messenger School Desk message
    const itemSummary = saleItems.map((i) => `${i.itemName} (×${i.quantity})`).join(", ");
    const msgId = `rzp-str-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const deskMessage = {
      id: msgId,
      schoolId: order.schoolId,
      threadType: "SCHOOL_DESK",
      studentId: order.studentId,
      studentName: order.studentName,
      senderId: "school_admin",
      senderName: "School Store & NSTA Online Desk",
      senderRole: "ADMIN",
      text: `🛍️ स्कूल स्टोर ऑर्डर पेमेंट प्राप्त! ${itemSummary} के लिए ₹${order.expectedAmount.toLocaleString(
        "en-IN"
      )} NSTA Online से जमा हो गए हैं। रसीद: ${receiptNo} (Payment ID: ${paymentId})। कृपया काउंटर से सामग्री प्राप्त करें।`,
      createdAt: paidAt,
      status: "delivered",
    };
    await rtdbPut(`schools/${safeSchool}/nsta_messages/${msgId}`, deskMessage);

    if (onNotify) {
      try {
        await onNotify({
          schoolId: order.schoolId,
          studentId: order.studentId,
          studentName: order.studentName,
          amount: order.expectedAmount,
          monthLabel: order.monthLabel || "School Store Order",
          receiptNo,
          purpose: "store_order",
        });
      } catch {}
    }

    return { duplicate: false, receiptNo, sale: saleRecord };
  }

  // ── BRANCH B: MONTHLY / ADMISSION FEE PAYMENT ──────────────────────────
  const receiptNo = `RZP-${paymentId.replace(/^pay_/, "").slice(0, 8).toUpperCase()}`;
  const feeDocId = cleanRtdbKey(`${order.studentId}_${order.month}`);

  const prevFee =
    (await rtdbGet<any>(`schools/${safeSchool}/fees/${feeDocId}`)) || {};

  const prevPaid = Number(prevFee.paidAmount || 0);
  const billedTotal = Math.max(
    Number(prevFee.amount || 0),
    Number(order.expectedAmount || 0)
  );
  const newPaidAmount = Math.min(
    billedTotal,
    prevPaid > 0 && prevFee.paid !== true
      ? prevPaid + order.expectedAmount
      : Math.max(prevPaid, order.expectedAmount)
  );
  const remainingDue = Math.max(0, billedTotal - newPaidAmount);
  const isFullyPaid = remainingDue <= 0;

  const updatedFee = {
    ...prevFee,
    id: prevFee.id || feeDocId,
    schoolId: order.schoolId,
    studentId: order.studentId,
    studentName: prevFee.studentName || order.studentName,
    classId: prevFee.classId || order.classId || "",
    className: prevFee.className || order.className || "",
    rollNo: prevFee.rollNo || order.rollNo || "",
    admissionNo: prevFee.admissionNo || order.admissionNo || "",
    sessionId: prevFee.sessionId || order.sessionId || "",
    month: order.month,
    amount: billedTotal,
    monthlyAmount: prevFee.monthlyAmount ?? billedTotal,
    paidAmount: newPaidAmount,
    balanceDue: remainingDue,
    paid: isFullyPaid,
    status: isFullyPaid ? "PAID" : "PARTIAL",
    paidDate: paidAt,
    paidBy: `Razorpay (${method || "UPI/Online"})`,
    paymentMode: `Razorpay ${method ? String(method).toUpperCase() : "Online"}`,
    receiptNo,
    razorpayOrderId: order.orderId,
    razorpayPaymentId: paymentId,
    verifiedViaWebhook: verifiedVia === "webhook",
    feeItems: prevFee.feeItems || order.feeItems || [],
    payModeInfo: {
      payMode: "NSTA Online (Razorpay)",
      onlinePaid: order.expectedAmount,
      cashPaid: 0,
      discountAmount: Number(prevFee.payModeInfo?.discountAmount || 0),
      transactionId: paymentId,
      razorpayOrderId: order.orderId,
    },
    updatedAt: paidAt,
  };

  // 1. Update fee record in RTDB
  await rtdbPut(`schools/${safeSchool}/fees/${feeDocId}`, updatedFee);

  // 2. Lock order as PAID (idempotency barrier)
  await rtdbPatch(`school_payment_orders/${safeOrderKey}`, {
    status: "PAID",
    paidAt,
    paymentId,
    receiptNo,
    method: method || "online",
    verifiedVia,
  });

  // 3. Deliver Official Receipt to student's NSTA Messenger School Desk
  const msgId = `rzp-rcp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const deskMessage = {
    id: msgId,
    schoolId: order.schoolId,
    threadType: "SCHOOL_DESK",
    studentId: order.studentId,
    studentName: order.studentName,
    senderId: "school_admin",
    senderName: "School Accounts & Online Fee Desk",
    senderRole: "ADMIN",
    text: `✅ ${order.monthLabel || order.month} ki online fee ₹${order.expectedAmount.toLocaleString(
      "en-IN"
    )} safalta-purvak prapt ho gayi hai! Official Receipt: ${receiptNo} (Payment ID: ${paymentId}).`,
    feeSlip: {
      type: "FEE_RECEIPT",
      month: order.month,
      monthLabel: order.monthLabel || order.month,
      amount: order.expectedAmount,
      balanceDue: remainingDue,
      monthlyAmount: billedTotal,
      studentName: order.studentName,
      className: order.className || "",
      rollNo: order.rollNo || "",
      admissionNo: order.admissionNo || "",
      feeItems: updatedFee.feeItems || [],
      receiptNo,
      dueDate: paidAt.split("T")[0],
    },
    createdAt: paidAt,
    status: "delivered",
  };
  await rtdbPut(`schools/${safeSchool}/nsta_messages/${msgId}`, deskMessage);

  if (onNotify) {
    try {
      await onNotify({
        schoolId: order.schoolId,
        studentId: order.studentId,
        studentName: order.studentName,
        amount: order.expectedAmount,
        monthLabel: order.monthLabel || order.month,
        receiptNo,
        purpose: "fee_payment",
      });
    } catch {}
  }

  return { duplicate: false, receiptNo, fee: updatedFee };
}

export async function verifySchoolRazorpayCheckout(
  input: {
    schoolId: string;
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
  onNotify?: Parameters<typeof finalizeRazorpayOrderPaid>[0]["onNotify"]
) {
  const schoolId = String(input.schoolId || "").trim();
  const orderId = String(input.razorpay_order_id || "").trim();
  const paymentId = String(input.razorpay_payment_id || "").trim();
  const signature = String(input.razorpay_signature || "").trim();

  if (!schoolId || !orderId || !paymentId || !signature) {
    return {
      status: 400,
      body: { ok: false, error: "Incomplete Razorpay verification payload" },
    };
  }

  const order = await rtdbGet<RazorpayOrderRecord>(
    `school_payment_orders/${cleanRtdbKey(orderId)}`
  );
  if (!order) {
    return {
      status: 404,
      body: { ok: false, error: "Payment order record not found" },
    };
  }
  if (order.schoolId !== schoolId) {
    return {
      status: 403,
      body: { ok: false, error: "Order does not belong to this school" },
    };
  }

  const cfg = await getSchoolRazorpayConfigRaw(schoolId);
  if (!cfg?.keySecret) {
    return {
      status: 400,
      body: { ok: false, error: "School Razorpay secret missing" },
    };
  }

  const expectedSig = crypto
    .createHmac("sha256", cfg.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (!timingSafeHexEqual(expectedSig, signature)) {
    return {
      status: 401,
      body: { ok: false, error: "Invalid Razorpay payment signature" },
    };
  }

  const result = await finalizeRazorpayOrderPaid({
    order,
    paymentId,
    method: "Online",
    verifiedVia: "checkout",
    onNotify,
  });

  return {
    status: 200,
    body: {
      ok: true,
      duplicate: result.duplicate,
      receiptNo: result.receiptNo,
      paymentId,
      orderId,
      fee: result.fee,
      sale: result.sale,
    },
  };
}

export async function handleSchoolRazorpayWebhook(params: {
  rawBody: string;
  parsedBody: any;
  signature: string;
  querySchoolId?: string;
  onNotify?: Parameters<typeof finalizeRazorpayOrderPaid>[0]["onNotify"];
}) {
  const { rawBody, parsedBody, signature, querySchoolId, onNotify } = params;
  const event = String(parsedBody?.event || "");

  if (event !== "payment.captured" && event !== "order.paid") {
    return {
      status: 200,
      body: { ok: true, ignored: true, event },
    };
  }

  const paymentEntity =
    parsedBody?.payload?.payment?.entity ||
    parsedBody?.payload?.order?.entity ||
    null;
  const orderEntity = parsedBody?.payload?.order?.entity || null;

  const orderId = String(
    paymentEntity?.order_id || orderEntity?.id || ""
  ).trim();
  const paymentId = String(paymentEntity?.id || "").trim();
  const paidPaise = Number(
    paymentEntity?.amount || orderEntity?.amount_paid || 0
  );
  const method = String(paymentEntity?.method || "online");

  if (!orderId || !paymentId) {
    return {
      status: 400,
      body: { ok: false, error: "Missing order_id or payment_id in webhook" },
    };
  }

  // Exact student+month order lock lookup — prevents cross-student misattribution
  const order = await rtdbGet<RazorpayOrderRecord>(
    `school_payment_orders/${cleanRtdbKey(orderId)}`
  );

  if (!order) {
    return {
      status: 200,
      body: {
        ok: true,
        ignored: true,
        reason: "Order not originated from NSTA School ERP",
      },
    };
  }

  const targetSchoolId = order.schoolId || String(querySchoolId || "").trim();
  const cfg = await getSchoolRazorpayConfigRaw(targetSchoolId);
  const secretToVerify = cfg?.webhookSecret || cfg?.keySecret || "";

  if (!secretToVerify) {
    return {
      status: 400,
      body: { ok: false, error: "Webhook secret not configured for school" },
    };
  }

  const bodyToHash =
    rawBody && rawBody.length > 0 ? rawBody : JSON.stringify(parsedBody || {});
  const expectedSig = crypto
    .createHmac("sha256", secretToVerify)
    .update(bodyToHash)
    .digest("hex");

  if (!timingSafeHexEqual(expectedSig, signature)) {
    return {
      status: 401,
      body: { ok: false, error: "Invalid Razorpay webhook signature" },
    };
  }

  if (paidPaise < order.expectedPaise) {
    return {
      status: 400,
      body: {
        ok: false,
        error: `Amount mismatch: paid ${paidPaise} < expected ${order.expectedPaise}`,
      },
    };
  }

  const result = await finalizeRazorpayOrderPaid({
    order,
    paymentId,
    method,
    verifiedVia: "webhook",
    onNotify,
  });

  return {
    status: 200,
    body: {
      ok: true,
      duplicate: result.duplicate,
      orderId,
      paymentId,
      studentId: order.studentId,
      month: order.month,
      receiptNo: result.receiptNo,
    },
  };
}
