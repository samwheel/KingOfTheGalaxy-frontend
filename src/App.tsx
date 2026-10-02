import { useState, useEffect } from "react";
import type { Star, Empire, Ship, ShipDesign } from "./types"
import Starmap from "./starmap"
import StarView from "./StarView"
import EmpireControls from "./empire_controls";
import ShipView from "./ShipView";
import { API_BASE_URL } from "./constants";

function App() {
    const [selectedStar, setSelectedStar] = useState<Star | null>(null);
    const [selectedStarShowsPlanets, setSelectedStarShowsPlanets] = useState(true);
    const [empires, setEmpires] = useState<Empire[]>([])
    const [refreshToken, setRefreshToken] = useState(0)
    const [turn, setTurn] = useState(0)
    const [ships, setShips] = useState<Ship[]>([])
    const [selectedShipName, setSelectedShipName] = useState<string | null>(null)
    const [starmap, setStarmap] = useState<Star[]>([])
    const handleSelectedStar = (star: Star | null, showPlanets = false) => {
        setSelectedStar(star)
        setSelectedStarShowsPlanets(star !== null && showPlanets)
    }

    useEffect(() => {
        let isCancelled = false;

        // Fetch empires and starmap together so we can find which star
        // contains the first planet returned by the API.
        Promise.all([
            fetch(`${API_BASE_URL}/empires`).then((response) => {
                if (!response.ok) throw new Error(`Request failed: ${response.status}`);
                return response.json();
            }),
            fetch(`${API_BASE_URL}/starmap`).then((response) => {
                if (!response.ok) throw new Error(`Request failed: ${response.status}`);
                return response.json();
            }),
            fetch(`${API_BASE_URL}/ships`).then((response) => {
                if (!response.ok) throw new Error(`Request failed: ${response.status}`);
                return response.json();
            }),
        ])
            .then(([empiresResult, starmapResult, shipsResult]) => {
                if (isCancelled) return;
                setEmpires(empiresResult);
                setShips(shipsResult);
                setSelectedShipName((currentName) =>
                    shipsResult.some((ship: Ship) => ship.model_name === currentName)
                        ? currentName
                        : shipsResult[0]?.model_name ?? null,
                );
                setStarmap(starmapResult);

                // Find the star that owns the first planet (if present)
                if (Array.isArray(empiresResult) && empiresResult.length > 0 && Array.isArray(empiresResult[0].planets) && empiresResult[0].planets.length > 0) {
                    const firstPlanetName = empiresResult[0].planets[0];
                    const foundStar = Array.isArray(starmapResult) ? (starmapResult as Star[]).find((s) => Array.isArray(s.planets) && s.planets.includes(firstPlanetName)) : undefined;
                    setSelectedStar((currentStar) => {
                        if (currentStar) return currentStar;
                        setSelectedStarShowsPlanets(true);
                        return foundStar ?? null;
                    });
                } else {
                    setSelectedStar((currentStar) => {
                        if (currentStar) return currentStar;
                        setSelectedStarShowsPlanets(false);
                        return null;
                    });
                }
            })
            .catch((error) => {
                console.error("Error fetching empires or starmap:", error);
            });

        return () => {
            isCancelled = true;
        };
    }, [refreshToken])

    useEffect(() => {
        let isCancelled = false;

        fetch(`${API_BASE_URL}/turn`)
            .then((response) => {
                if (!response.ok) throw new Error(`Request failed: ${response.status}`);
                return response.json();
            })
            .then((data) => {
                if (!isCancelled) {
                    setTurn(data.turn);
                }
            })
            .catch((error) => {
                console.error("Error fetching turn:", error);
            });

        return () => {
            isCancelled = true;
        };
    }, [refreshToken]);

    const moveShip = async (ship: Ship, destination: string) => {
        const response = await fetch(`${API_BASE_URL}/ships/${encodeURIComponent(ship.model_name)}/move`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ destination }),
        });
        const responseText = await response.text();
        let result: { error?: string } = {};
        try {
            result = JSON.parse(responseText) as { error?: string };
        } catch {
            throw new Error(`Movement service returned an unexpected response (${response.status})`);
        }
        if (!response.ok) {
            throw new Error(result.error ?? `Request failed: ${response.status}`);
        }
        setRefreshToken((token) => token + 1);
    };

    const purchaseShip = async (model: ShipDesign, planet: string) => {
        const response = await fetch(`${API_BASE_URL}/empires/${encodeURIComponent(empires[0].name)}/ships`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model_name: model.model_name, planet }),
        });
        const responseText = await response.text();
        let result: { error?: string } = {};
        try {
            result = JSON.parse(responseText) as { error?: string };
        } catch {
            throw new Error(`Shipyard returned an unexpected response (${response.status})`);
        }
        if (!response.ok) {
            throw new Error(result.error ?? `Request failed: ${response.status}`);
        }
        setRefreshToken((token) => token + 1);
    };

    const selectedShip = ships.find((ship) => ship.model_name === selectedShipName) ?? ships[0];

    return (
        <>
            <Starmap
                setSelectedStar={handleSelectedStar}
                empires={empires}
                ships={ships}
                selectedShipName={selectedShip?.model_name}
                onSelectShip={(ship) => setSelectedShipName(ship.model_name)}
                selectedStar={selectedStar}
                refreshToken={refreshToken}
                onMoveShip={moveShip}
            />
            {selectedStar && <StarView star={selectedStar} empires={empires} refreshToken={refreshToken} showPlanets={selectedStarShowsPlanets} />}
            {selectedShip && <ShipView ship={selectedShip} ships={ships} stars={starmap} onSelectShip={(ship) => setSelectedShipName(ship.model_name)} onMove={moveShip} />}
            {empires[0] && (
                <EmpireControls
                    empire={empires[0]}
                    refreshToken={refreshToken}
                    setRefreshToken={setRefreshToken}
                    turn={turn}
                    stars={starmap}
                    onPurchase={purchaseShip}
                />
            )}
        </>
    )
}

export default App