// Shared amount bounds for the money-request workflow (solicitudes: intención,
// transferencia, rendición). Approval by tesorería/BURSAR still gates anything
// unusually large — the cap here just keeps the field sane, it isn't a budget limit.
export const MIN_REQUEST_AMOUNT = 1_000
export const MAX_REQUEST_AMOUNT = 5_000_000

export const REQUEST_AMOUNT_MIN_MESSAGE = `El monto mínimo es $${MIN_REQUEST_AMOUNT.toLocaleString("es-CL")}`
export const REQUEST_AMOUNT_MAX_MESSAGE = `El monto máximo es $${MAX_REQUEST_AMOUNT.toLocaleString("es-CL")}`
