"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];

type Facility = {
  name: string;
  state: string;
  facility_type: string | null;
};

type Props = {
  onSelect: (facilityName: string, stateCode: string) => void;
};

export default function FacilityTypeahead({ onSelect }: Props) {
  const [selectedState, setSelectedState] = useState("");
  const [searchText, setSearchText] = useState("");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [confirmed, setConfirmed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load all facilities for the selected state
  useEffect(() => {
    if (!selectedState) { setFacilities([]); return; }
    supabase
      .from("facilities")
      .select("name, state, facility_type")
      .eq("state", selectedState)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => setFacilities(data || []));
    setSearchText("");
    setConfirmed(false);
    onSelect("", selectedState);
  }, [selectedState]);

  // Filter as user types — show up to 10 results
  const filtered = searchText.length === 0
    ? facilities.slice(0, 10)
    : facilities
        .filter((f) => f.name.toLowerCase().includes(searchText.toLowerCase()))
        .slice(0, 10);

  function handleSelect(facility: Facility) {
    setSearchText(facility.name);
    setShowDropdown(false);
    setConfirmed(true);
    onSelect(facility.name, facility.state);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
        handleSelect(filtered[highlightedIndex]);
      } else if (filtered.length === 1) {
        handleSelect(filtered[0]);
      } else if (searchText.trim()) {
        // Allow manual entry if no match found
        setConfirmed(true);
        setShowDropdown(false);
        onSelect(searchText.trim(), selectedState);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Step 1 — State */}
      <div>
        <label className="block text-sm font-bold text-zinc-300">
          State <span className="text-amber-400">*</span>
        </label>
        <select
          value={selectedState}
          onChange={(e) => {
            setSelectedState(e.target.value);
            setHighlightedIndex(-1);
          }}
          className="mt-2 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-white"
        >
          <option value="">Select a state...</option>
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Step 2 — Facility typeahead (only shown once state is picked) */}
      {selectedState && (
        <div className="relative">
          <label className="block text-sm font-bold text-zinc-300">
            Facility Name
            {confirmed && <span className="ml-2 text-xs font-normal text-green-400">✓ confirmed</span>}
          </label>
          <input
            ref={inputRef}
            type="text"
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setShowDropdown(true);
              setHighlightedIndex(-1);
              setConfirmed(false);
              onSelect(e.target.value, selectedState);
            }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            onKeyDown={handleKeyDown}
            placeholder={
              facilities.length > 0
                ? `Type to search ${facilities.length} facilities in ${selectedState}...`
                : `Type facility name...`
            }
            className={
              "mt-2 w-full rounded-xl border p-3 text-white placeholder:text-zinc-600 bg-zinc-950 transition " +
              (confirmed ? "border-green-500" : "border-zinc-700")
            }
          />

          {showDropdown && filtered.length > 0 && (
            <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
              {filtered.map((facility, i) => (
                <li
                  key={facility.name}
                  onMouseDown={() => handleSelect(facility)}
                  className={
                    "cursor-pointer px-4 py-3 text-sm transition " +
                    (i === highlightedIndex
                      ? "bg-amber-400 text-black"
                      : "text-white hover:bg-zinc-800")
                  }
                >
                  <span className="font-bold">{facility.name}</span>
                  {facility.facility_type && (
                    <span
                      className={
                        "ml-2 text-xs " +
                        (i === highlightedIndex ? "opacity-70" : "text-zinc-500")
                      }
                    >
                      {facility.facility_type}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {showDropdown && searchText.length > 1 && filtered.length === 0 && (
            <div className="absolute z-50 mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-400 shadow-2xl">
              No matches — your typed name will be used as-is.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
