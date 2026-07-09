import { createInboundEmailRouteSchema } from "../inbound-email-route"

describe("createInboundEmailRouteSchema", () => {
  it("accepts a valid local_part and user_id", () => {
    const result = createInboundEmailRouteSchema.safeParse({
      local_part: "tesoreria",
      user_id: "123e4567-e89b-12d3-a456-426614174000"
    })
    expect(result.success).toBe(true)
  })

  it("rejects uppercase local_part", () => {
    const result = createInboundEmailRouteSchema.safeParse({
      local_part: "Tesoreria",
      user_id: "123e4567-e89b-12d3-a456-426614174000"
    })
    expect(result.success).toBe(false)
  })

  it("rejects local_part with an @ symbol", () => {
    const result = createInboundEmailRouteSchema.safeParse({
      local_part: "tesoreria@pibtalcahuano.com",
      user_id: "123e4567-e89b-12d3-a456-426614174000"
    })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid user_id", () => {
    const result = createInboundEmailRouteSchema.safeParse({
      local_part: "tesoreria",
      user_id: "not-a-uuid"
    })
    expect(result.success).toBe(false)
  })

  it("rejects an empty local_part", () => {
    const result = createInboundEmailRouteSchema.safeParse({
      local_part: "",
      user_id: "123e4567-e89b-12d3-a456-426614174000"
    })
    expect(result.success).toBe(false)
  })
})
