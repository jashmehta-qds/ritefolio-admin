"use client";

import { useEffect, useMemo, useState } from "react";
import { Select, SelectItem, SelectSection } from "@heroui/select";
import axiosInstance from "@/lib/axios";

interface InvestmentSegment {
  Id: number;
  Category: string;
  Description: string;
  IsActive: boolean;
}

interface InvestmentType {
  Id: number;
  InvestmentId: number;
  ShortCode: string;
  Description: string;
}

// Segments hidden from stock filters: Derivatives (FUT, OPT) and Cryptocurrencies
const EXCLUDED_SEGMENT_IDS = [7, 9];

interface InvestmentFilterProps {
  investmentTypes: InvestmentType[];
  selectedSegments: string[];
  selectedTypes: string[];
  onSegmentsChange: (segmentIds: string[]) => void;
  onTypesChange: (typeIds: string[]) => void;
}

export default function InvestmentFilter({
  investmentTypes,
  selectedSegments,
  selectedTypes,
  onSegmentsChange,
  onTypesChange,
}: InvestmentFilterProps) {
  const [segments, setSegments] = useState<InvestmentSegment[]>([]);

  useEffect(() => {
    const fetchSegments = async () => {
      try {
        const response = await axiosInstance.get("/investment/segment");
        const result = response.data;
        if (result.success) {
          setSegments(
            (result.data as InvestmentSegment[]).filter(
              (s) => !EXCLUDED_SEGMENT_IDS.includes(s.Id),
            ),
          );
        }
      } catch (error) {
        console.error("Error fetching investment segments:", error);
      }
    };

    fetchSegments();
  }, []);

  // Selected segments, each with its investment types
  const typeGroups = useMemo(
    () =>
      segments
        .filter((s) => selectedSegments.includes(s.Id.toString()))
        .map((segment) => ({
          segment,
          types: investmentTypes.filter((t) => t.InvestmentId === segment.Id),
        }))
        .filter((group) => group.types.length > 0),
    [segments, investmentTypes, selectedSegments],
  );

  const handleSegmentsChange = (segmentIds: string[]) => {
    onSegmentsChange(segmentIds);

    // Drop selected types that no longer belong to a selected segment
    const allowedTypeIds = new Set(
      investmentTypes
        .filter((t) => segmentIds.includes(t.InvestmentId.toString()))
        .map((t) => t.Id.toString()),
    );
    const prunedTypes = selectedTypes.filter((id) => allowedTypeIds.has(id));
    if (prunedTypes.length !== selectedTypes.length) {
      onTypesChange(prunedTypes);
    }
  };

  return (
    <>
      <Select
        aria-label="Filter by investment segment"
        placeholder="Filter by segment"
        selectionMode="multiple"
        selectedKeys={new Set(selectedSegments)}
        onSelectionChange={(keys) => {
          if (keys === "all") return;
          handleSegmentsChange(Array.from(keys as Set<string>));
        }}
        className="max-w-[200px]"
        size="md"
      >
        {segments.map((segment) => (
          <SelectItem key={segment.Id.toString()} textValue={segment.Category}>
            {segment.Category}
          </SelectItem>
        ))}
      </Select>
      <Select
        aria-label="Filter by investment type"
        placeholder={
          selectedSegments.length > 0
            ? "Filter by investment type"
            : "Select a segment first"
        }
        selectionMode="multiple"
        selectedKeys={new Set(selectedTypes)}
        onSelectionChange={(keys) => {
          if (keys === "all") return;
          onTypesChange(Array.from(keys as Set<string>));
        }}
        isDisabled={typeGroups.length === 0}
        className="max-w-[240px]"
        size="md"
      >
        {typeGroups.map(({ segment, types }) => (
          <SelectSection key={segment.Id} title={segment.Category} showDivider>
            {types.map((type) => (
              <SelectItem
                key={type.Id.toString()}
                textValue={`${type.ShortCode} - ${type.Description}`}
              >
                {type.ShortCode} - {type.Description}
              </SelectItem>
            ))}
          </SelectSection>
        ))}
      </Select>
    </>
  );
}
