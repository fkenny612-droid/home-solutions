/**
 * Paid subscription plans cannot be bought yet — the server refuses them (SubscriptionsService.subscribe) until
 * subscription payments are built. While this is false the app must not advertise anything a paid plan would give
 * (warranty, discounts, lower commission) or let someone tap into a purchase that will fail.
 *
 * Flip to true together with removing that server guard.
 */
export const PAID_PLANS_AVAILABLE = false
