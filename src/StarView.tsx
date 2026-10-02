import { useEffect, useState } from "react";
import type { Star, Planet, Empire } from "./types";
import { API_BASE_URL } from "./constants";
import "./StarView.scss";

const planetImages = import.meta.glob("./assets/planets/*.{png,jpg,jpeg,webp,avif}", {
    eager: true,
    import: "default",
}) as Record<string, string>;

function getPlanetImageUrl(environment: string): string | undefined {
    const normalizedEnvironment = environment.trim().toLowerCase();
    const matchingKey = Object.keys(planetImages).find((key) => {
        const fileName = key.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "";
        return fileName.toLowerCase() === normalizedEnvironment;
    });

    return matchingKey ? planetImages[matchingKey] : undefined;
}

export default function StarView(props: {star: Star; empires: Empire[]; refreshToken: number; showPlanets: boolean}) {
    const { star } = props;
    const [planets, setPlanets] = useState<Planet[]>([]);

    useEffect(() => {
        if (!star || !props.showPlanets) {
            setPlanets([]);
            return;
        }

        let isCancelled = false;

        fetch(`${API_BASE_URL}/starmap/${encodeURIComponent(star.name)}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Request failed: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!isCancelled) {
                    

                    setPlanets(data.planets);
                }
            })
            .catch(error => {
                console.error("Error fetching star data:", error);
                if (!isCancelled) {
                    setPlanets([]);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [star?.name, props.refreshToken, props.showPlanets]);

    const planets_to_colors: Record<string, string> = {}
    for(let empire of props.empires) {
        for(let planet of empire.planets) {
            planets_to_colors[planet] = empire.color
        }   
    }

    const starColor = star.planets
        .map((planet) => planets_to_colors[planet])
        .find((color) => Boolean(color)) ?? "white";

    return (
        <div className="star-view">
            <h2 style={{ color: starColor }}>{star.name}</h2>
            {props.showPlanets ? (
                <div className="planets">
                    {planets.map((planet, index) => {
                        const planetColor = planets_to_colors[planet.name] ?? "white";
                        const planetImageUrl = getPlanetImageUrl(planet.environment);

                        return (
                            <div className="planet" key={index}>
                                <h3 className="planet-name" style={{ color: planetColor }}>{planet.name}</h3>
                                <div className="planet-content">
                                    <div
                                        className="environment"
                                        style={{ backgroundImage: planetImageUrl ? `url("${planetImageUrl}")` : undefined }}
                                    />
                                    {planet.statistics.population !== 0.0 && (
                                        <ul>
                                            <li>Population: {planet.statistics.population.toPrecision(2)}</li>
                                            <li>Revenue: {planet.statistics.revenue.toPrecision(2)}</li>
                                            <li>Research: {planet.statistics.research.toPrecision(2)}</li>
                                            <li>Defense: {planet.statistics.defense.toPrecision(2)}</li>
                                            <li>Detection Range: {planet.statistics.detection_range.toPrecision(2)}</li>
                                        </ul>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="unknown-planets" aria-label="Planets are outside detection range">?</div>
            )}
        </div>
    )
}