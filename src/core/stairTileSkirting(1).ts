/** Stair tile and skirting quantities. Units: metres and counts. */
export interface StairFlightQuantity {
  id: string;
  /** Actual number of treads in this flight. */
  treadCount: number;
  treadDepth: number;
  riserHeight: number;
}

export interface StairLandingQuantity {
  id: string;
  length: number;
  width: number;
  /** Three actual wall-adjacent sides, in metres. */
  wallSides: readonly [number, number, number];
}

export interface StairTileSkirtingResult {
  stepTileCount: number;
  landingTileArea: number;
  flightSkirtingLength: number;
  landingSkirtingLength: number;
  stairSkirtingLength: number;
}

const nonNegative = (n: number): number => Number.isFinite(n) ? Math.max(0, n) : 0;

export function calculateStairTileSkirting(
  flights: readonly StairFlightQuantity[],
  landings: readonly StairLandingQuantity[],
): StairTileSkirtingResult {
  const stepTileCount = flights.reduce((sum, flight) =>
    sum + Math.floor(nonNegative(flight.treadCount)), 0);

  const flightSkirtingLength = flights.reduce((sum, flight) =>
    sum + Math.floor(nonNegative(flight.treadCount)) *
      (nonNegative(flight.treadDepth) + nonNegative(flight.riserHeight)), 0);

  const landingTileArea = landings.reduce((sum, landing) =>
    sum + nonNegative(landing.length) * nonNegative(landing.width), 0);

  const landingSkirtingLength = landings.reduce((sum, landing) =>
    sum + landing.wallSides.reduce((sideSum, side) => sideSum + nonNegative(side), 0), 0);

  return {
    stepTileCount,
    landingTileArea,
    flightSkirtingLength,
    landingSkirtingLength,
    stairSkirtingLength: flightSkirtingLength + landingSkirtingLength,
  };
}
