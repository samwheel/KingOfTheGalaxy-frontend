import { useEffect, useState } from "react"
import type { Empire, ShipDesign, Star } from "./types"
import "./empire_controls.scss"
import { API_BASE_URL } from "./constants"

export default function EmpireControls(props: { empire: Empire, refreshToken: number, setRefreshToken: (token: number | ((token: number) => number)) => void, turn: number, stars: Star[], onPurchase: (model: ShipDesign, planet: string) => Promise<void> }) {
    const [isShipyardOpen, setIsShipyardOpen] = useState(false)
    const [designs, setDesigns] = useState<ShipDesign[]>([])
    const [selectedModel, setSelectedModel] = useState("")
    const [selectedPlanet, setSelectedPlanet] = useState(props.empire.planets[0] ?? "")
    const [error, setError] = useState<string | null>(null)
    const [isPurchasing, setIsPurchasing] = useState(false)

    function handleTurnButtonClick() {
        fetch(`${API_BASE_URL}/turn_update`, { method: "POST" })
            .then((response) => {
                if (!response.ok) throw new Error(`Request failed: ${response.status}`);
                return response.json();
            })
            .then(() => {
                props.setRefreshToken((token) => token + 1);
            })
            .catch((error) => {
                console.error("Error advancing turn:", error);
            });
    }

    useEffect(() => {
        if (!isShipyardOpen || designs.length > 0) return
        fetch(`${API_BASE_URL}/shipyard`)
            .then((response) => {
                if (!response.ok) throw new Error(`Request failed: ${response.status}`)
                return response.json() as Promise<ShipDesign[]>
            })
            .then((result) => {
                setDesigns(result)
                setSelectedModel(result[0]?.model_name ?? "")
            })
            .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load shipyard"))
    }, [isShipyardOpen, designs.length])

    async function handlePurchase() {
        const model = designs.find((design) => design.model_name === selectedModel)
        if (!model || !selectedPlanet) return
        setIsPurchasing(true)
        setError(null)
        try {
            await props.onPurchase(model, selectedPlanet)
            setIsShipyardOpen(false)
        } catch (purchaseError) {
            setError(purchaseError instanceof Error ? purchaseError.message : "Unable to purchase ship")
        } finally {
            setIsPurchasing(false)
        }
    }

    const controlledPlanets = props.empire.planets.map((planetName) => ({
        name: planetName,
        star: props.stars.find((star) => star.planet_details.some((planet) => planet.name === planetName))?.name,
    }))

    return (
        <div className="empire-controls">
            <button className="turn-button" onClick={handleTurnButtonClick}>Turn {props.turn}</button>
            <button className="money" onClick={() => { setError(null); setIsShipyardOpen(true) }}>Money: {props.empire.money.toPrecision(2)}</button>
            <button className="research">Research</button>
            {isShipyardOpen && (
                <div className="shipyard-backdrop" onClick={() => setIsShipyardOpen(false)}>
                    <section className="shipyard" role="dialog" aria-modal="true" aria-labelledby="shipyard-title" onClick={(event) => event.stopPropagation()}>
                        <div className="shipyard__header">
                            <div>
                                <span className="shipyard__eyebrow">Fleet command</span>
                                <h2 id="shipyard-title">Shipyard</h2>
                            </div>
                            <button className="shipyard__close" type="button" aria-label="Close shipyard" onClick={() => setIsShipyardOpen(false)}>×</button>
                        </div>
                        <p className="shipyard__balance">Available funds: {props.empire.money.toPrecision(2)}</p>
                        <label htmlFor="shipyard-planet">Construction site</label>
                        <select id="shipyard-planet" value={selectedPlanet} onChange={(event) => setSelectedPlanet(event.target.value)}>
                            {controlledPlanets.map((planet) => <option key={planet.name} value={planet.name}>{planet.name} · {planet.star ?? "Unknown star"}</option>)}
                        </select>
                        <div className="shipyard__designs">
                            {designs.map((design) => (
                                <button
                                    type="button"
                                    className={`shipyard__design ${selectedModel === design.model_name ? "shipyard__design--selected" : ""}`}
                                    key={design.model_name}
                                    onClick={() => setSelectedModel(design.model_name)}
                                >
                                    <strong>{design.model_name}</strong>
                                    <span>{design.cost} credits</span>
                                    <small>SPD {design.speed} · ARM {design.armor} · DET {design.detection_range}</small>
                                </button>
                            ))}
                        </div>
                        {error && <p className="shipyard__error">{error}</p>}
                        <button className="shipyard__purchase" type="button" disabled={!selectedModel || !selectedPlanet || isPurchasing} onClick={handlePurchase}>
                            {isPurchasing ? "Constructing..." : "Construct ship"}
                        </button>
                    </section>
                </div>
            )}
        </div>
    )
}