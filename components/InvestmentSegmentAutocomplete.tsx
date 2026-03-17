"use client";

import React, { useEffect, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { FiLayers } from "react-icons/fi";
import axiosInstance from "@/lib/axios";

interface InvestmentSegment {
  Id: number;
  Category: string;
  IsActive: boolean;
}

interface InvestmentSegmentAutocompleteProps {
  name: string;
  label: string;
  placeholder?: string;
  value?: number | string;
  onSelectionChange: (value: number | null) => void;
  variant?: "bordered" | "flat" | "faded" | "underlined";
  size?: "sm" | "md" | "lg";
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  isDisabled?: boolean;
  ids?: number[];
}

export const InvestmentSegmentAutocomplete: React.FC<
  InvestmentSegmentAutocompleteProps
> = ({
  name,
  label,
  placeholder = "Select investment segment",
  value,
  onSelectionChange,
  variant = "bordered",
  size = "md",
  isRequired = false,
  isInvalid = false,
  errorMessage,
  isDisabled = false,
  ids,
}) => {
  const [segments, setSegments] = useState<InvestmentSegment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stringify ids so the effect only re-runs when actual values change,
  // not when the parent passes a new array reference on every render.
  const idsKey = ids?.join(",") ?? "";

  useEffect(() => {
    const fetchSegments = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await axiosInstance.get("/investment/segment?isActive=true");
        if (response.data.success && response.data.data) {
          const allSegments: InvestmentSegment[] = response.data.data;
          setSegments(
            ids && ids.length > 0
              ? allSegments.filter((s) => ids.includes(s.Id))
              : allSegments
          );
        } else {
          setError(
            response.data.message || "Failed to load investment segments"
          );
        }
      } catch {
        setError("Failed to load investment segments");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSegments();
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectionChange = (key: React.Key | null) => {
    if (key) {
      const selected = segments.find((s) => s.Id.toString() === key);
      onSelectionChange(selected ? selected.Id : null);
    } else {
      onSelectionChange(null);
    }
  };

  const selectedKey = value ? value.toString() : null;

  if (error) {
    return (
      <div className="p-3 border border-danger-200 bg-danger-50 rounded-lg">
        <p className="text-danger-700 text-sm">
          Error loading investment segments: {error}
        </p>
      </div>
    );
  }

  return (
    <Autocomplete
      name={name}
      label={label}
      placeholder={placeholder}
      variant={variant}
      size={size}
      selectedKey={selectedKey}
      onSelectionChange={handleSelectionChange}
      isRequired={isRequired}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
      isDisabled={isDisabled}
      isLoading={isLoading}
      startContent={<FiLayers className="w-4 h-4 text-default-400" />}
      defaultItems={segments}
    >
      {(segment) => (
        <AutocompleteItem key={segment.Id} textValue={segment.Category}>
          {segment.Category}
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
};

export default InvestmentSegmentAutocomplete;
