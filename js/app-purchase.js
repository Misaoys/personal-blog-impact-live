const exprPlan = {
  key: "pro",
  name: "PRO",
  price: 30,
  detail: "仅提供 PRO 一个版本，支付方式为免服务费收款码。"
};

const exprPurchaseApi = {
  orderEndpoint: "/api/expr-flow/orders",
  configEndpoint: "/api/expr-flow/payment/config",
  notifyPath: "/api/expr-flow/alipay/notify",
  alipayMethod: "alipay.trade.precreate",
  productCode: "FACE_TO_FACE_PAYMENT",
  manualMethod: "static.collection_qr",
  manualProductCode: "MANUAL_QR",
  pollPath(orderId) {
    return `/api/expr-flow/orders/${encodeURIComponent(orderId)}`;
  }
};

const exprPendingOrderKey = "exprFlowPendingOrder";
const exprPendingOrderMaxAge = 24 * 60 * 60 * 1000;

const exprOrder = {
  id: "",
  outTradeNo: "",
  email: "",
  timer: 0,
  licenseKey: ""
};

const exprPaymentConfig = {
  checked: false,
  ready: true,
  mode: "manual_qr"
};

let exprLastPaymentModalTrigger = null;

function isManualPaymentMode() {
  return exprPaymentConfig.mode === "manual_qr";
}

function getPurchaseEls() {
  return {
    root: document.querySelector("[data-purchase-root]"),
    form: document.getElementById("exprCheckoutForm"),
    email: document.getElementById("buyerEmail"),
    emailError: document.querySelector("[data-email-error]"),
    selectedPlan: document.querySelector("[data-selected-plan]"),
    selectedDetail: document.querySelector("[data-selected-detail]"),
    status: document.querySelector("[data-order-status]"),
    title: document.querySelector("[data-payment-title]"),
    message: document.querySelector("[data-payment-message]"),
    qr: document.querySelector("[data-qr-box]"),
    qrImage: document.querySelector("[data-alipay-qr]"),
    modal: document.querySelector("[data-payment-modal]"),
    modalClose: document.querySelector("[data-payment-modal-close]"),
    openModal: document.querySelector("[data-open-payment-modal]"),
    actions: document.querySelector(".checkout-actions"),
    retry: document.querySelector("[data-retry-payment]"),
    submit: document.querySelector("[data-pay-submit]"),
    checkoutJump: document.querySelector("[data-open-checkout-modal], [data-scroll-checkout]")
  };
}

function makeOrderId() {
  return "EXF" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function formatAmount(value) {
  return Number(value).toFixed(2);
}

function buildReturnUrl(orderId) {
  const url = new URL(location.href);
  url.searchParams.set("expr_flow_order", orderId);
  url.searchParams.set("route", "about");
  return url.toString();
}

function updatePlanSummary() {
  const els = getPurchaseEls();
  if (!els.root) return;
  if (els.selectedPlan) els.selectedPlan.textContent = `${exprPlan.name} / ${exprPlan.price} RMB`;
  if (els.selectedDetail) els.selectedDetail.textContent = exprPlan.detail;
}

function setEmailError(message) {
  const els = getPurchaseEls();
  if (els.emailError) els.emailError.textContent = message || "";
  if (els.email) els.email.setAttribute("aria-invalid", message ? "true" : "false");
}

function validEmail(email) {
  const value = String(email || "").trim();
  if (!value || value.length > 254 || value.includes("..")) return false;
  return /^[^\s@<>()[\]\\.,;:"]+(\.[^\s@<>()[\]\\.,;:"]+)*@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(value);
}

function resetPaymentEntry() {
  const els = getPurchaseEls();
  if (els.qr) els.qr.classList.remove("has-image", "is-active");
  if (els.openModal) els.openModal.hidden = true;
  if (els.qrImage) {
    els.qrImage.hidden = true;
    els.qrImage.removeAttribute("src");
  }
}

function getPaymentModalFallbackTrigger(els) {
  if (els.checkoutJump) return els.checkoutJump;
  if (els.openModal && !els.openModal.hidden) return els.openModal;
  return els.submit || null;
}

function canRestorePaymentModalFocus(element) {
  return Boolean(
    element?.isConnected &&
    !element.hidden &&
    !element.disabled &&
    typeof element.focus === "function"
  );
}

function restorePaymentModalFocus() {
  const els = getPurchaseEls();
  els.modal?.classList.remove("is-open");
  const trigger = canRestorePaymentModalFocus(exprLastPaymentModalTrigger)
    ? exprLastPaymentModalTrigger
    : getPaymentModalFallbackTrigger(els);
  if (canRestorePaymentModalFocus(trigger)) {
    trigger.focus({ preventScroll: true });
  }
}

function openPaymentModal(trigger, options = {}) {
  const els = getPurchaseEls();
  if (!els.modal) return;
  const wasOpen = els.modal.open;
  if (!wasOpen && trigger && typeof trigger.focus === "function") {
    exprLastPaymentModalTrigger = trigger;
  } else if (!wasOpen && document.activeElement && typeof document.activeElement.focus === "function") {
    exprLastPaymentModalTrigger = document.activeElement;
  }
  if (!wasOpen) {
    if (typeof els.modal.showModal === "function") {
      els.modal.showModal();
    } else {
      els.modal.setAttribute("open", "");
    }
  }
  els.modal.classList.add("is-open");
  if (!wasOpen) {
    window.requestAnimationFrame(() => {
      const focusTarget = options.focusEmail ? els.email : els.modalClose || els.modal;
      focusTarget?.focus({ preventScroll: true });
    });
  }
}

function closePaymentModal() {
  const els = getPurchaseEls();
  if (!els.modal || !els.modal.open) return;
  if (typeof els.modal.close === "function") {
    els.modal.close();
    restorePaymentModalFocus();
    return;
  }
  els.modal.removeAttribute("open");
  restorePaymentModalFocus();
}

function setPurchaseStep(step, isError) {
  document.querySelectorAll("[data-step]").forEach(item => {
    const activeOrder = ["order", "pay", "mail", "done"];
    const itemIndex = activeOrder.indexOf(item.dataset.step);
    const stepIndex = activeOrder.indexOf(step);
    item.classList.toggle("is-active", stepIndex >= itemIndex && stepIndex >= 0);
    item.classList.toggle("is-error", Boolean(isError && item.dataset.step === step));
  });
}

function setPurchaseStatus(status, title, message, options = {}) {
  const els = getPurchaseEls();
  const hideSubmit = Boolean(options.qr || options.retry || options.step === "done");
  if (els.status) els.status.textContent = status;
  if (els.title) els.title.textContent = title;
  if (els.message) els.message.textContent = message;
  if (els.qr) els.qr.classList.toggle("is-active", Boolean(options.qr));
  if (els.openModal) els.openModal.hidden = !options.qr;
  if (els.retry) els.retry.hidden = !options.retry;
  if (els.submit) {
    els.submit.hidden = hideSubmit;
    els.submit.disabled = Boolean(options.busy || options.disabled || !exprPaymentConfig.ready);
  }
  if (els.actions) {
    els.actions.hidden = Boolean(hideSubmit && !options.retry);
  }
  setPurchaseStep(options.step || "order", options.error);
  const statusNode = els.root?.closest(".page-view")?.querySelector(".sr-status") || document.getElementById("screenStatus");
  if (statusNode) statusNode.textContent = title;
}

function setPaymentConfigUnavailable(status = {}) {
  exprPaymentConfig.checked = true;
  exprPaymentConfig.ready = false;
  resetPaymentEntry();
  const mode = status.paymentMode || exprPaymentConfig.mode;
  const manualMode = mode === "manual_qr";
  setPurchaseStatus(
    "未就绪",
    manualMode ? "收款码未配置。" : "支付通道未就绪。",
    manualMode
      ? "管理员配置免服务费收款码后才能显示二维码；页面不会展示内部路径或配置名称。"
      : "管理员完成支付宝扫码配置后才能生成二维码；页面不会展示密钥名称或内部接口。",
    { step: "order", disabled: true, error: true }
  );
  openPaymentModal(getPaymentModalFallbackTrigger(getPurchaseEls()));
}

async function refreshPaymentConfig() {
  try {
    const response = await fetch(exprPurchaseApi.configEndpoint, { headers: { Accept: "application/json" } });
    if (!response.ok) return true;
    const status = await response.json();
    if (!status || typeof status.ready !== "boolean") return true;
    exprPaymentConfig.checked = true;
    exprPaymentConfig.ready = status.ready;
    exprPaymentConfig.mode = status.paymentMode || exprPaymentConfig.mode || "manual_qr";
    if (!status.ready) {
      setPaymentConfigUnavailable(status);
      return false;
    }
    return true;
  } catch {
    // Static previews may not expose the payment config endpoint.
    return true;
  }
}

function readOrderId(order) {
  return order?.orderId || order?.id || order?.outTradeNo || order?.out_trade_no || "";
}

function readQrImage(order) {
  return order?.qrCodeUrl || order?.qrImage || order?.qrImageUrl || order?.qrDataUrl || "";
}

function readLicense(order) {
  return order?.licenseKey || order?.license || order?.cardKey || order?.cardSecret || "";
}

function readPendingOrder() {
  try {
    const raw = window.localStorage?.getItem(exprPendingOrderKey);
    if (!raw) return null;
    const pending = JSON.parse(raw);
    if (!pending?.orderId || !pending?.email) return null;
    if (Date.now() - Number(pending.createdAt || 0) > exprPendingOrderMaxAge) {
      window.localStorage.removeItem(exprPendingOrderKey);
      return null;
    }
    return pending;
  } catch {
    return null;
  }
}

function savePendingOrder(order) {
  try {
    window.localStorage?.setItem(exprPendingOrderKey, JSON.stringify({
      orderId: order.orderId,
      outTradeNo: order.outTradeNo || order.orderId,
      email: order.email,
      qrCodeUrl: order.qrCodeUrl || "",
      createdAt: Date.now()
    }));
  } catch {
    // localStorage can be unavailable in private or restricted browser modes.
  }
}

function clearPendingOrder() {
  try {
    window.localStorage?.removeItem(exprPendingOrderKey);
  } catch {
    // Ignore storage cleanup failures; the server order remains authoritative.
  }
}

function normalizeOrderStatus(order) {
  const raw = String(order?.status || order?.tradeStatus || order?.trade_status || order?.alipayTradeStatus || "").toLowerCase();
  if (["license_sent", "done", "completed", "success"].includes(raw)) return "license_sent";
  if (["paid", "trade_success", "trade_finished"].includes(raw)) return "paid";
  if (["payment_failed", "trade_closed", "closed", "failed", "cancelled", "canceled"].includes(raw)) return "payment_failed";
  if (["manual_review", "manual_pending", "awaiting_review"].includes(raw)) return "pending";
  return "pending";
}

function showQr(order) {
  const els = getPurchaseEls();
  const qrImage = readQrImage(order);
  if (!qrImage || !els.qr || !els.qrImage) {
    setPurchaseStatus("创建失败", "服务端未返回二维码。", "请检查支付服务是否已经把支付宝 qr_code 转成二维码图片。", { step: "order", retry: true, error: true });
    return false;
  }
  els.qrImage.src = qrImage;
  els.qrImage.hidden = false;
  els.qr.classList.add("has-image", "is-active");
  return true;
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || "接口不可用");
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function createServerOrder() {
  exprOrder.outTradeNo = makeOrderId();
  if (isManualPaymentMode()) {
    return postJson(exprPurchaseApi.orderEndpoint, {
      product: "expr-flow",
      channel: "manual_qr",
      method: exprPurchaseApi.manualMethod,
      productCode: exprPurchaseApi.manualProductCode,
      outTradeNo: exprOrder.outTradeNo,
      plan: exprPlan.key,
      amount: formatAmount(exprPlan.price),
      email: exprOrder.email,
      payMode: "manual_qr",
      subject: "expr-flow PRO",
      body: "expr-flow PRO 版本卡密",
      note: exprOrder.outTradeNo
    });
  }
  return postJson(exprPurchaseApi.orderEndpoint, {
    product: "expr-flow",
    channel: "alipay",
    method: exprPurchaseApi.alipayMethod,
    productCode: exprPurchaseApi.productCode,
    outTradeNo: exprOrder.outTradeNo,
    plan: exprPlan.key,
    amount: formatAmount(exprPlan.price),
    email: exprOrder.email,
    payMode: "qr",
    subject: "expr-flow PRO",
    body: "expr-flow PRO 版本卡密",
    returnUrl: buildReturnUrl(exprOrder.outTradeNo),
    notifyPath: exprPurchaseApi.notifyPath
  });
}

async function pollServerOrder(orderId) {
  const response = await fetch(exprPurchaseApi.pollPath(orderId));
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.message || "订单轮询不可用");
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function stopPolling() {
  window.clearTimeout(exprOrder.timer);
  exprOrder.timer = 0;
}

async function pollRealPayment(orderId) {
  let attempts = 0;
  const tick = async () => {
    attempts += 1;
    try {
      const order = await pollServerOrder(orderId);
      const status = normalizeOrderStatus(order);
      const license = readLicense(order);
      if (license) exprOrder.licenseKey = license;
      if (status === "license_sent") {
        stopPolling();
        clearPendingOrder();
        const keyText = exprOrder.licenseKey ? `卡密 ${exprOrder.licenseKey} ` : "卡密";
        resetPaymentEntry();
        setPurchaseStatus("已完成", "支付完成，卡密已生成。", `${keyText}已绑定至 ${exprOrder.email}。请保存卡密并完成激活。`, { step: "done" });
        return;
      }
      if (status === "paid") {
        setPurchaseStatus("生成卡密", "支付成功，正在生成 PRO 卡密。", "服务端已确认支付宝付款结果，正在生成并绑定卡密。", { step: "mail", busy: true });
      } else if (status === "payment_failed") {
        stopPolling();
        clearPendingOrder();
        resetPaymentEntry();
        setPurchaseStatus("支付关闭", "二维码已失效。", "本次扫码订单未完成付款，请重新生成二维码。", { step: "pay", retry: true, error: true });
        return;
      }
    } catch (error) {
      if (attempts > 5) {
        stopPolling();
        setPurchaseStatus("查询异常", "暂时无法查询支付结果。", "订单已创建，但状态接口暂时不可用；请稍后重新生成二维码或检查支付服务。", { step: "pay", retry: true, error: true });
        return;
      }
    }
    exprOrder.timer = window.setTimeout(tick, 1800);
  };
  tick();
}

async function startPayment() {
  if (!exprPaymentConfig.ready) {
    setPaymentConfigUnavailable();
    return;
  }
  const els = getPurchaseEls();
  const email = els.email?.value.trim() || "";
  if (!validEmail(email)) {
    setEmailError("请输入正确的邮箱格式，用于绑定订单和接收卡密提示。");
    els.email?.focus();
    return;
  }
  if (!(await refreshPaymentConfig())) return;

  setEmailError("");
  stopPolling();
  resetPaymentEntry();
  exprOrder.email = email;
  exprOrder.id = "";
  exprOrder.outTradeNo = "";
  exprOrder.licenseKey = "";
  setPurchaseStatus(
    "创建订单",
    isManualPaymentMode() ? "正在生成免服务费收款码订单。" : "正在生成支付宝扫码订单。",
    isManualPaymentMode()
      ? "服务端只保存订单邮箱和备注号，并返回固定收款码；页面不会接入聚合支付平台。"
      : "服务端会完成支付宝签名并返回二维码，页面不会保存任何私钥。",
    { step: "order", busy: true }
  );
  openPaymentModal(els.submit);

  try {
    const order = await createServerOrder();
    exprOrder.id = readOrderId(order) || exprOrder.outTradeNo || makeOrderId();
    if (!showQr(order)) return;
    savePendingOrder({
      orderId: exprOrder.id,
      outTradeNo: exprOrder.outTradeNo || exprOrder.id,
      email: exprOrder.email,
      qrCodeUrl: readQrImage(order)
    });
    if (isManualPaymentMode()) {
      const note = order.manualNote || exprOrder.id;
      setPurchaseStatus(
        "待核对",
        "请扫码付款并填写订单备注。",
        `收款码已显示。付款金额 30 RMB，订单备注 ${note}；核对通过后页面会自动显示 PRO 卡密。`,
        { step: "pay", qr: true, busy: true }
      );
    } else {
      setPurchaseStatus("待扫码", "请使用支付宝扫码付款。", "支付宝二维码已生成。完成付款后页面会自动查询订单状态并显示 PRO 卡密。", { step: "pay", qr: true, busy: true });
    }
    await pollRealPayment(exprOrder.id);
  } catch (error) {
    setPurchaseStatus(
      "创建失败",
      isManualPaymentMode() ? "收款码订单创建失败。" : "支付宝扫码订单创建失败。",
      error.message || "请检查支付服务配置后重试。",
      { step: "order", retry: true, error: true }
    );
  }
}

(function initExprPurchase() {
  const els = getPurchaseEls();
  if (!els.root || !els.form) return;
  updatePlanSummary();
  setEmailError("");
  els.form.addEventListener("submit", event => {
    event.preventDefault();
    startPayment();
  });
  els.submit?.addEventListener("click", event => {
    event.preventDefault();
    startPayment();
  });
  els.email?.addEventListener("input", () => {
    if (!els.email?.value) {
      setEmailError("");
      return;
    }
    if (validEmail(els.email.value)) setEmailError("");
  });
  els.retry?.addEventListener("click", startPayment);
  els.openModal?.addEventListener("click", event => {
    event.preventDefault();
    openPaymentModal(event.currentTarget);
  });
  els.modalClose?.addEventListener("click", closePaymentModal);
  els.modal?.addEventListener("click", event => {
    if (event.target === els.modal) closePaymentModal();
  });
  els.modal?.addEventListener("close", restorePaymentModalFocus);
  els.checkoutJump?.addEventListener("click", event => {
    event.preventDefault();
    openPaymentModal(event.currentTarget, { focusEmail: true });
  });
  const pendingOrder = readPendingOrder();
  if (pendingOrder) {
    exprOrder.id = pendingOrder.orderId;
    exprOrder.outTradeNo = pendingOrder.outTradeNo || pendingOrder.orderId;
    exprOrder.email = pendingOrder.email;
    exprOrder.licenseKey = "";
    if (els.email && !els.email.value) els.email.value = pendingOrder.email;
    resetPaymentEntry();
    if (pendingOrder.qrCodeUrl && els.qr && els.qrImage) {
      els.qrImage.src = pendingOrder.qrCodeUrl;
      els.qrImage.hidden = false;
      els.qr.classList.add("has-image", "is-active");
    }
    setPurchaseStatus(isManualPaymentMode() ? "待核对" : "待扫码", isManualPaymentMode() ? "继续查询待核对订单。" : "继续查询未完成的扫码订单。", isManualPaymentMode() ? "已恢复上一次生成的收款码；核对通过后页面会自动显示 PRO 卡密。" : "已恢复上一次生成的支付宝二维码；完成付款后页面会自动显示 PRO 卡密。", {
      step: "pay",
      qr: Boolean(pendingOrder.qrCodeUrl),
      busy: Boolean(pendingOrder.qrCodeUrl),
      retry: !pendingOrder.qrCodeUrl
    });
    pollRealPayment(pendingOrder.orderId);
  }
})();
