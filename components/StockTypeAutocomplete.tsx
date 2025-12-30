"use client";

import React, { useEffect, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { FiLayers } from "react-icons/fi";
import axiosInstance from "@/lib/axios";

export interface StockType {
  Id: number;
  InvestmentId: number;
  InvestmentCategory: string;
  ShortCode: string;
  Description: string;
  IsActive: boolean;
}

interface StockTypeAutocompleteProps {
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
  description?: string;
  startContent?: React.ReactNode;
  investmentSegmentId?: number;
}

export const StockTypeAutocomplete: React.FC<StockTypeAutocompleteProps> = ({
  name,
  label,
  placeholder = "Search and select stock type",
  value,
  onSelectionChange,
  variant = "flat",
  size = "md",
  isRequired = false,
  isInvalid = false,
  errorMessage,
  isDisabled = false,
  description,
  startContent,
  investmentSegmentId,
}) => {
  const [stockTypes, setStockTypes] = useState<StockType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStockTypes = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (investmentSegmentId) {
          params.append("investmentSegmentId", investmentSegmentId.toString());
        }
        params.append("isActive", "true");

        const queryString = params.toString();
        const url = queryString
          ? `/investment/type?${queryString}`
          : "/investment/type";

        const response = await axiosInstance.get(url);

        if (response.data.success && response.data.data) {
          setStockTypes(response.data.data);
        } else {
          setError(response.data.message || "Failed to load stock types");
        }
      } catch (err) {
        console.error("Error fetching stock types:", err);
        setError("Failed to load stock types");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStockTypes();
  }, [investmentSegmentId]);

  const handleSelectionChange = (key: React.Key | null) => {
    if (key) {
      const selectedStockType = stockTypes.find(
        (stockType) => stockType.Id.toString() === key
      );
      onSelectionChange(selectedStockType ? selectedStockType.Id : null);
    } else {
      onSelectionChange(null);
    }
  };

  const selectedKeys = value ? [value.toString()] : [];

  if (error) {
    return (
      <div className="p-3 border border-danger-200 bg-danger-50 rounded-lg">
        <p className="text-danger-700 text-sm">
          Error loading stock types: {error}
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
      selectedKey={selectedKeys.length > 0 ? selectedKeys[0] : null}
      onSelectionChange={handleSelectionChange}
      isRequired={isRequired}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
      isDisabled={isDisabled}
      isLoading={isLoading}
      description={description}
      startContent={
        startContent || <FiLayers className="w-4 h-4 text-default-400" />
      }
      defaultItems={stockTypes}
      aria-labelledby="stock-type-autocomplete"
      classNames={{
        popoverContent: "min-w-[450px] w-auto max-w-[600px]",
      }}
    >
      {(stockType) => (
        <AutocompleteItem key={stockType.Id} textValue={stockType.ShortCode}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {stockType.ShortCode && <span>({stockType.ShortCode})</span>}
              {stockType.InvestmentCategory && (
                <span>- {stockType.InvestmentCategory}</span>
              )}
            </div>
          </div>
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
};

export default StockTypeAutocomplete;
