import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react"
import type { Ship, Star } from "./types"
import "./starmap.scss"
import type { Empire } from "./types";
import DetectionCircle from "./detection_circle";
import { API_BASE_URL } from "./constants";

export default function Starmap(props: { setSelectedStar: (star: Star | null, showPlanets?: boolean) => void; empires: Empire[]; ships: Ship[]; selectedShipName?: string; selectedStar?: Star | null; refreshToken: number; onSelectShip: (ship: Ship) => void; onMoveShip: (ship: Ship, destination: string) => Promise<void> }) {
    const [starmap, setStarmap] = useState<Star[]>([])
    const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [zoomLevel, setZoomLevel] = useState(1)
    const coordinateScale = 10
    const dragStartRef = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null)
    const isDraggingRef = useRef(false)
    const wasDraggedRef = useRef(false)
    const containerRef = useRef<HTMLDivElement | null>(null)
        const animRef = useRef<number | null>(null)
    const viewOffsetRef = useRef(viewOffset)

    useEffect(() => {
        viewOffsetRef.current = viewOffset
    }, [viewOffset])

    useEffect(() => {
        fetch(`${API_BASE_URL}/starmap`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Request failed: ${response.status}`)
                }
                return response.json()
            })
            .then((data: Star[]) => {
                setStarmap(data)
            })
            .catch((error) => console.error("Error fetching starmap:", error))
    }, [props.refreshToken])

    // Center the view on the selected star only when the selection changes.
    // Perform a smooth pan animation using requestAnimationFrame.
    useEffect(() => {
        const star = props.selectedStar
        if (!star || !containerRef.current) return

        const rect = containerRef.current.getBoundingClientRect()
        const starX = star.coordinates[0]
        const starY = star.coordinates[1]

        const centerScreenX = rect.width / 2
        const centerScreenY = rect.height / 2

        const nextViewX = centerScreenX / (zoomLevel * coordinateScale) - starX
        const nextViewY = centerScreenY / (zoomLevel * coordinateScale) - starY

        // Smooth pan animation to the computed offset
        const duration = 500
        if (animRef.current) {
            cancelAnimationFrame(animRef.current)
            animRef.current = null
        }

        const startX = viewOffsetRef.current.x
        const startY = viewOffsetRef.current.y
        const startTime = performance.now()

        const step = (time: number) => {
            const elapsed = time - startTime
            const t = Math.min(1, elapsed / duration)
            // easeInOutQuad
            const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
            const curX = startX + (nextViewX - startX) * eased
            const curY = startY + (nextViewY - startY) * eased
            setViewOffset({ x: curX, y: curY })
            viewOffsetRef.current = { x: curX, y: curY }
            if (t < 1) {
                animRef.current = requestAnimationFrame(step)
            } else {
                animRef.current = null
            }
        }

        animRef.current = requestAnimationFrame(step)

        return () => {
            if (animRef.current) {
                cancelAnimationFrame(animRef.current)
                animRef.current = null
            }
        }
    }, [props.selectedStar])

    const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
        dragStartRef.current = {
            x: event.clientX,
            y: event.clientY,
            offsetX: viewOffset.x,
            offsetY: viewOffset.y,
        }
        isDraggingRef.current = false
        wasDraggedRef.current = false
        setIsDragging(false)
            // If the user starts dragging, cancel any ongoing pan animation
            if (animRef.current) {
                cancelAnimationFrame(animRef.current)
                animRef.current = null
            }
    }

    const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!dragStartRef.current) {
            return
        }

        const deltaX = event.clientX - dragStartRef.current.x
        const deltaY = event.clientY - dragStartRef.current.y
        const movementThreshold = 8

        if (!isDraggingRef.current && (Math.abs(deltaX) > movementThreshold || Math.abs(deltaY) > movementThreshold)) {
            isDraggingRef.current = true
            wasDraggedRef.current = true
            setIsDragging(true)
            event.currentTarget.setPointerCapture(event.pointerId)
        }

        if (!isDraggingRef.current) {
            return
        }

        setViewOffset({
            x: dragStartRef.current.offsetX + deltaX / (zoomLevel * coordinateScale),
            y: dragStartRef.current.offsetY + deltaY / (zoomLevel * coordinateScale),
        })
    }

    const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }

        dragStartRef.current = null
        isDraggingRef.current = false
        setIsDragging(false)
    }


    const handleScroll = (event: React.WheelEvent<HTMLDivElement>) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const mouseX = event.clientX - rect.left
        const mouseY = event.clientY - rect.top
        const zoomFactor = 0.1
        const nextZoomLevel = Math.max(0.1, Math.min(zoomLevel - event.deltaY * zoomFactor * 0.01, 10))

        if (nextZoomLevel === zoomLevel) {
            return
        }

        const worldX = mouseX / (zoomLevel * coordinateScale) - viewOffset.x
        const worldY = mouseY / (zoomLevel * coordinateScale) - viewOffset.y

        setViewOffset({
            x: mouseX / (nextZoomLevel * coordinateScale) - worldX,
            y: mouseY / (nextZoomLevel * coordinateScale) - worldY,
        })
        setZoomLevel(nextZoomLevel)
    }

    const handleStarClick = (event: ReactMouseEvent<HTMLDivElement>, star: Star) => {
        event.stopPropagation()
        props.setSelectedStar(star, detectedStarNames.has(star.name))
    }

    const handleStarContextMenu = async (event: ReactMouseEvent<HTMLDivElement>, star: Star) => {
        event.preventDefault()
        event.stopPropagation()

        const ship = props.ships.find((fleetShip) => fleetShip.model_name === props.selectedShipName) ?? props.ships[0]
        if (!ship || ship.location.kind !== "star") return

        if (ship.location.star !== star.name) {
            await props.onMoveShip(ship, star.name)
        }
    }

    const isStarInteractionTarget = (target: EventTarget | null) => {
        if (!(target instanceof HTMLElement)) {
            return false
        }

        return target.closest(".star, .star-container, .star-background, .star-name") !== null
    }

    const handleBackgroundClick = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (wasDraggedRef.current) {
            wasDraggedRef.current = false
            return
        }

        if (isStarInteractionTarget(event.target)) {
            return
        }

        props.setSelectedStar(null, false)
    }

    const planets_to_colors: Record<string, string> = {}
    for(let empire of props.empires) {
        for(let planet of empire.planets) {
            planets_to_colors[planet] = empire.color
        }   
    }

    const playerEmpire = props.empires[0]
    const detectableRegion = playerEmpire?.detectable_region ?? []

    const detectedStarNames = new Set(starmap
        .filter((star) => detectableRegion.some((source) => {
            const deltaX = star.coordinates[0] - source.center[0]
            const deltaY = star.coordinates[1] - source.center[1]
            return Math.sqrt(deltaX * deltaX + deltaY * deltaY) <= source.radius
        }))
        .map((star) => star.name))

    const connectedStarNames = new Set(starmap
        .filter((star) => detectedStarNames.has(star.name))
        .flatMap((star) => star.star_lane_connections))

    const visibleStarmap = starmap.filter((star) =>
        detectedStarNames.has(star.name) || connectedStarNames.has(star.name)
    )

    return (
        <div
            className={`starmap ${isDragging ? "dragging" : ""}`}
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onLostPointerCapture={handlePointerUp}
            onWheel={handleScroll}
            onClick={handleBackgroundClick}
        >
            {visibleStarmap.map((star, index) => {
                const starColor = star.planets
                    .map((planet) => planets_to_colors[planet])
                    .find((color) => Boolean(color)) ?? "white";

                const detectionRegions = detectableRegion.filter((region) =>
                    region.center[0] === star.coordinates[0]
                    && region.center[1] === star.coordinates[1]
                )

                return (
                    <div key={index} className="star" style={
                        {
                            left: `${(star.coordinates[0] + viewOffset.x) * zoomLevel * coordinateScale}px`,
                            top: `${(star.coordinates[1] + viewOffset.y) * zoomLevel * coordinateScale}px`,
                            color: starColor,
                        }
                    }>
                        <div
                            className="star-container"
                            onClick={(event) => handleStarClick(event, star)}
                            onContextMenu={(event) => void handleStarContextMenu(event, star)}
                        >
                            <div className="star-background">
                                {detectionRegions.map((region, regionIndex) => (
                                    <DetectionCircle
                                        key={regionIndex}
                                        radius={region.radius * zoomLevel * coordinateScale}
                                        color={starColor}
                                    />
                                ))}
                            </div>
                            <h3 className="star-name">{star.name}</h3>
                        </div>
                    </div>
                )
            })}
            {visibleStarmap.map((star, index) => (
                star.star_lane_connections.map((connectedStar, connectionIndex) => {
                    const connectedStarData = visibleStarmap.find(s => s.name === connectedStar)
                    if (!connectedStarData || star.name > connectedStar) return null

                    const x1 = (star.coordinates[0] + viewOffset.x) * zoomLevel * coordinateScale
                    const y1 = (star.coordinates[1] + viewOffset.y) * zoomLevel * coordinateScale - 17
                    const x2 = (connectedStarData.coordinates[0] + viewOffset.x) * zoomLevel * coordinateScale
                    const y2 = (connectedStarData.coordinates[1] + viewOffset.y) * zoomLevel * coordinateScale - 17

                    return (
                        <svg key={`${index}-${connectionIndex}`} className="star-connection" style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%" }}>
                            <line className="star-lane-glow" x1={x1} y1={y1} x2={x2} y2={y2} />
                            <line className="star-lane" x1={x1} y1={y1} x2={x2} y2={y2} />
                        </svg>
                    )
                })
            ))}
            {props.ships.map((ship) => {
                const [shipX, shipY] = ship.location.coordinates
                const isOrbitingStar = ship.location.kind === "star"
                const orbitingStar = isOrbitingStar
                    ? starmap.find((star) => star.name === ship.location.star)
                    : undefined
                const [detectionX, detectionY] = orbitingStar?.coordinates ?? [shipX, shipY]
                const mapX = (isOrbitingStar ? detectionX : shipX) + viewOffset.x
                const mapY = (isOrbitingStar ? detectionY : shipY) + viewOffset.y
                const screenLeft = mapX * zoomLevel * coordinateScale
                const screenTop = mapY * zoomLevel * coordinateScale - (isOrbitingStar ? 17 : 0)
                return (
                    <div key={ship.model_name}>
                        <div
                            className="ship-detection"
                            style={{
                                left: `${screenLeft}px`,
                                top: `${screenTop}px`,
                            }}
                        >
                            <DetectionCircle
                                radius={ship.detection_range * zoomLevel * coordinateScale}
                                color={props.empires.find((empire) => empire?.ships?.includes(ship))?.color ?? "white"}
                            />
                        </div>
                        <div
                            className={`ship-marker-orbit ${ship.location.kind === "star" ? "ship-marker-orbit--active" : ""}`}
                            style={{
                                left: `${screenLeft}px`,
                                top: `${screenTop}px`,
                            }}
                        >
                            <div
                                className={`ship-marker ${props.selectedShipName === ship.model_name ? "ship-marker--selected" : ""}`}
                                title={`Select ${ship.model_name}`}
                                onClick={(event) => {
                                    event.stopPropagation()
                                    props.onSelectShip(ship)
                                }}
                            >
                                <span />
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}