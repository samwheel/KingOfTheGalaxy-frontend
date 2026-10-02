import { useEffect, useState } from "react"
import type { Ship, Star } from "./types"
import "./ship_view.scss"

export default function ShipView({ ship, ships, stars, onSelectShip, onMove }: { ship: Ship; ships: Ship[]; stars: Star[]; onSelectShip: (ship: Ship) => void; onMove: (ship: Ship, destination: string) => Promise<void> }) {
    const [destination, setDestination] = useState("")
    const [isMoving, setIsMoving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const location = ship.location.kind === "star"
        ? `At ${ship.location.star}`
        : `${ship.location.start} -> ${ship.location.end} (${ship.location.turns_remaining} turns)`
    const currentStar = ship.location.kind === "star"
        ? stars.find((star) => star.name === ship.location.star)
        : undefined
    const destinations = currentStar?.star_lane_connections
        .map((name) => stars.find((star) => star.name === name))
        .filter((star): star is Star => star !== undefined) ?? []

    useEffect(() => {
        setDestination("")
        setError(null)
    }, [ship.location.coordinates[0], ship.location.coordinates[1]])

    async function handleMove() {
        if (!destination) return
        setIsMoving(true)
        setError(null)
        try {
            await onMove(ship, destination)
        } catch (moveError) {
            setError(moveError instanceof Error ? moveError.message : "Unable to move ship")
        } finally {
            setIsMoving(false)
        }
    }

    return (
        <aside className="ship-view">
            <span className="ship-view__eyebrow">Active vessel</span>
            <label className="ship-view__fleet-label" htmlFor="active-ship">Fleet vessel</label>
            <select
                className="ship-view__fleet-select"
                id="active-ship"
                value={ship.model_name}
                onChange={(event) => {
                    const nextShip = ships.find((fleetShip) => fleetShip.model_name === event.target.value)
                    if (nextShip) onSelectShip(nextShip)
                }}
            >
                {ships.map((fleetShip) => <option key={fleetShip.model_name} value={fleetShip.model_name}>{fleetShip.model_name}</option>)}
            </select>
            <h2>{ship.model_name}</h2>
            <p className="ship-view__location">{location}</p>
            <div className="ship-view__movement">
                <label htmlFor="ship-destination">Set course</label>
                <div className="ship-view__route">
                    <select
                        id="ship-destination"
                        value={destination}
                        onChange={(event) => setDestination(event.target.value)}
                        disabled={isMoving || destinations.length === 0}
                    >
                        <option value="">Choose a connected star</option>
                        {destinations.map((star) => <option key={star.name} value={star.name}>{star.name}</option>)}
                    </select>
                    <button type="button" onClick={handleMove} disabled={!destination || isMoving}>
                        {isMoving ? "Moving..." : "Move"}
                    </button>
                </div>
                {destinations.length === 0 && ship.location.kind === "star" && <span className="ship-view__hint">No connected lanes available.</span>}
                {ship.location.kind === "star" && <span className="ship-view__hint">Right-click any visible destination star to set course.</span>}
                {ship.location.kind === "lane" && <span className="ship-view__hint">Traveling at {Math.round((ship.location.progress ?? 0) * 100)}%.</span>}
                {error && <span className="ship-view__error">{error}</span>}
            </div>
            <dl>
                <div><dt>Speed</dt><dd>{ship.speed}</dd></div>
                <div><dt>Armor</dt><dd>{ship.armor}</dd></div>
                <div><dt>Weapons</dt><dd>{ship.weapon_power}</dd></div>
                <div><dt>Fuel</dt><dd>{ship.fuel_capacity}</dd></div>
            </dl>
        </aside>
    )
}