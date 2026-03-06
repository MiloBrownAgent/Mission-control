"use client";

import { useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet default icon issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type MarkerCategory = "dining" | "explore" | "airport" | "home";
type FilterType = "all" | "dining" | "explore" | "airport";

interface MapMarker {
  name: string;
  desc: string;
  lat: number;
  lng: number;
  category: MarkerCategory;
  note?: string;
}

const CATEGORY_COLORS: Record<MarkerCategory, string> = {
  dining: "#B8965A",
  explore: "#5C6B5E",
  airport: "#4A90D9",
  home: "#C05A5A",
};

const MARKERS: MapMarker[] = [
  // Dining
  { name: "The Olde Pink House", desc: "18th-century mansion. Southern fine dining at its best. Dinner only.", lat: 32.0806, lng: -81.0914, category: "dining" },
  { name: "The Grey", desc: "James Beard Award-winning restaurant in a restored 1938 Greyhound bus terminal.", lat: 32.0818, lng: -81.0968, category: "dining" },
  { name: "Husk Savannah", desc: "Modern Southern cuisine in an 1890s building on Oglethorpe Square.", lat: 32.0800, lng: -81.0933, category: "dining" },
  { name: "Common Thread", desc: "New American with Southern roots. Intimate, thoughtful menu.", lat: 32.0693, lng: -81.0919, category: "dining", note: "Our reservation Friday the 14th" },
  { name: "Mrs. Wilkes' Dining Room", desc: "Legendary boarding house-style lunch. Communal tables, fried chicken, collard greens. Cash only.", lat: 32.0773, lng: -81.0935, category: "dining" },
  { name: "Treylor Park", desc: "Creative Southern comfort. Great cocktails. Casual but excellent.", lat: 32.0818, lng: -81.0884, category: "dining" },
  { name: "The Pirates' House", desc: "Historic tavern since 1753. Fun atmosphere, solid seafood.", lat: 32.0820, lng: -81.0892, category: "dining" },
  { name: "Little Duck Diner", desc: "Elevated diner fare. Brunch favorite. Charming, compact.", lat: 32.0812, lng: -81.0881, category: "dining" },
  { name: "Huey's on the River", desc: "New Orleans-style on River Street. Beignets and views.", lat: 32.0812, lng: -81.0887, category: "dining" },
  { name: "The Wyld Dock Bar", desc: "Casual waterfront spot on the marsh. Seafood, craft cocktails, live music.", lat: 32.0649, lng: -81.0586, category: "dining" },
  // Explore
  { name: "Forsyth Park", desc: "Savannah's crown jewel. 30 acres of live oaks and the iconic fountain.", lat: 32.0743, lng: -81.0944, category: "explore" },
  { name: "Chippewa Square", desc: "One of Savannah's 22 historic squares. Walk the whole district.", lat: 32.0795, lng: -81.0936, category: "explore" },
  { name: "River Street", desc: "Nine blocks of shops, galleries, and restaurants along the Savannah River.", lat: 32.0823, lng: -81.0892, category: "explore" },
  { name: "Wormsloe Historic Site", desc: "A mile-long avenue of 400+ live oaks draped in Spanish moss.", lat: 31.9946, lng: -81.0467, category: "explore" },
  { name: "Bonaventure Cemetery", desc: "Hauntingly beautiful Victorian cemetery made famous by Midnight in the Garden.", lat: 32.0603, lng: -81.0317, category: "explore" },
  { name: "SCAD Museum of Art", desc: "Contemporary art museum in a stunning 1853 railroad building.", lat: 32.0819, lng: -81.0972, category: "explore" },
  { name: "Cathedral of St. John the Baptist", desc: "French Gothic cathedral built in 1876. Free to visit.", lat: 32.0808, lng: -81.0921, category: "explore" },
  { name: "Leopold's Ice Cream", desc: "Iconic Savannah ice cream shop since 1919. Always worth the line.", lat: 32.0793, lng: -81.0878, category: "explore" },
  { name: "Tybee Island", desc: "Just 20 minutes east of Savannah. Wide, sandy beach and laid-back vibes.", lat: 31.9988, lng: -80.8447, category: "explore" },
  // Airport
  { name: "Savannah/Hilton Head Airport (SAV)", desc: "Small airport — meet right at baggage claim. No rideshares, no stress.", lat: 32.1272, lng: -81.2021, category: "airport" },
  // Home
  { name: "Ford Field & River Club", desc: "35 Belted Kingfisher, Richmond Hill, GA — your home base.", lat: 31.9401, lng: -81.3024, category: "home" },
];

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "dining", label: "Dining" },
  { id: "explore", label: "Explore" },
  { id: "airport", label: "Home & Airport" },
];

const LEGEND_ITEMS = [
  { color: "#B8965A", label: "Dining" },
  { color: "#5C6B5E", label: "Explore" },
  { color: "#4A90D9", label: "Airport" },
  { color: "#C05A5A", label: "Home base" },
];

export default function SavannahMap() {
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredMarkers = MARKERS.filter((m) => {
    if (filter === "all") return true;
    if (filter === "airport") return m.category === "airport" || m.category === "home";
    return m.category === filter;
  });

  return (
    <div className="space-y-4">
      {/* Filter row */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === f.id
                ? "bg-[#5C6B5E] text-white"
                : "bg-[#F7F4EF] text-[#5C6B5E] border border-[#E8E4DD] hover:bg-[#E8E4DD]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="h-[70vh] rounded-2xl overflow-hidden border border-[#E8E4DD]">
        <MapContainer
          center={[32.0808, -81.0912]}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredMarkers.map((marker) => (
            <CircleMarker
              key={marker.name}
              center={[marker.lat, marker.lng]}
              radius={marker.category === "home" ? 10 : 8}
              pathOptions={{
                color: CATEGORY_COLORS[marker.category],
                fillColor: CATEGORY_COLORS[marker.category],
                fillOpacity: 0.85,
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ minWidth: "160px", maxWidth: "220px" }}>
                  <p style={{ fontWeight: 600, marginBottom: "4px", fontSize: "14px", lineHeight: 1.3 }}>
                    {marker.name}
                  </p>
                  <p style={{ color: "#5C6B5E", fontSize: "12px", marginBottom: "8px", lineHeight: 1.4 }}>
                    {marker.desc}
                  </p>
                  {marker.note && (
                    <p style={{ color: "#B8965A", fontSize: "11px", marginBottom: "8px", fontStyle: "italic" }}>
                      ✦ {marker.note}
                    </p>
                  )}
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(
                      marker.name + (marker.category === "home" ? " Richmond Hill GA" : " Savannah GA")
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#4A90D9", fontSize: "12px", textDecoration: "underline" }}
                  >
                    Get Directions →
                  </a>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 p-4 bg-[#F7F4EF] rounded-xl border border-[#E8E4DD]">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-[#5C6B5E]">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
