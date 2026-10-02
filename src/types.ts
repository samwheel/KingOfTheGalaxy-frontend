export type Planet = {
    "name": string;
    "environment": string;
    "statistics": {
        "population": number;
        "revenue": number;
        "research": number;
        "defense": number;
        "detection_range": number;
    }
};

export type Empire = {
    "name": string;
    "color": string;
    "planets": string[];
    "detectable_region": {
        "center": [number, number];
        "radius": number;
    }[];
    "production": {
        "population": number;
        "revenue": number;
        "research": number;
        "defense": number;
        "supply": number;
        "detection_range": number;
    };
    "money": number;
    "ships": Ship[];
};

export type Star = {
    name: string;
    coordinates: [number, number];
    planets: string[];
    planet_details: Planet[];
    star_lane_connections: string[];
};

export type Ship = {
    model_name: string;
    speed: number;
    fuel_capacity: number;
    fuel_consumption: number;
    armor: number;
    weapon_power: number;
    detection_range: number;
    location: {
        kind: "star" | "lane";
        star?: string;
        start?: string;
        end?: string;
        progress?: number;
        turns_remaining?: number;
        route?: string[];
        coordinates: [number, number];
    };
};

export type ShipDesign = {
    model_name: string;
    cost: number;
    speed: number;
    fuel_capacity: number;
    fuel_consumption: number;
    armor: number;
    weapon_power: number;
    detection_range: number;
};
