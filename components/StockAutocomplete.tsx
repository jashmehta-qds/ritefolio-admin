"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { FiDatabase } from "react-icons/fi";
import axiosInstance from "@/lib/axios";

export interface Stock {
  Id: string;
  Name: string;
  Symbol: string;
  Isin: string;
  BseCode: string;
  Sector: string | null;
  MacroSector: string | null;
  Industry: string | null;
  Listed: boolean;
  IsActive: boolean;
}

interface StockAutocompleteProps {
  name: string;
  label: string;
  placeholder?: string;
  value?: string; // Stock ID
  onSelectionChange: (stockId: string | null, stock?: Stock) => void;
  variant?: "bordered" | "flat" | "faded" | "underlined";
  size?: "sm" | "md" | "lg";
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  isDisabled?: boolean;
  description?: string;
  startContent?: React.ReactNode;
  investmentTypeId?: number;
  sector?: string;
  minSearchLength?: number;
  maxResults?: number;
  initialStockName?: string;
}

export const StockAutocomplete: React.FC<StockAutocompleteProps> = ({
  name,
  label,
  placeholder = "Type to search stocks by name, symbol, ISIN, or BSE code...",
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
  investmentTypeId,
  sector,
  minSearchLength = 2,
  maxResults = 50,
  initialStockName,
}) => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(initialStockName || "");
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  // Refs for managing debounce and abort controllers
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update searchValue when initialStockName changes (for edit mode)
  useEffect(() => {
    if (initialStockName) {
      setSearchValue(initialStockName);
    }
  }, [initialStockName]);

  // Debounce search input
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 300); // 300ms debounce delay

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchValue]);

  // Search stocks based on debounced input
  const searchStocks = useCallback(
    async (searchTerm: string) => {
      // Abort previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Don't search if term is too short
      if (!searchTerm || searchTerm.length < minSearchLength) {
        setStocks([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();

        // Build query parameters
        const params = new URLSearchParams();
        params.append("search", searchTerm);
        params.append("isActive", "true");
        params.append("limit", maxResults.toString());

        if (investmentTypeId) {
          params.append("investmentTypeId", investmentTypeId.toString());
        }
        if (sector) {
          params.append("sector", sector);
        }

        const response = await axiosInstance.get(
          `/stocks?${params.toString()}`,
          {
            signal: abortControllerRef.current.signal,
          }
        );

        // Check if request was aborted
        if (abortControllerRef.current.signal.aborted) {
          return;
        }

        if (response.data.success && response.data.data) {
          setStocks(response.data.data);
        } else {
          setError(response.data.message || "Failed to search stocks");
          setStocks([]);
        }
      } catch (err: any) {
        // Don't set error if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        const errorMessage =
          err?.response?.data?.message ||
          err?.message ||
          "Failed to search stocks";
        setError(errorMessage);
        setStocks([]);
      } finally {
        // Only set loading to false if request wasn't aborted
        if (!abortControllerRef.current?.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    [investmentTypeId, sector, minSearchLength, maxResults]
  );

  // Effect to trigger search when debounced value changes
  useEffect(() => {
    searchStocks(debouncedSearchValue);

    // Cleanup function to abort request on unmount or when dependencies change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedSearchValue, searchStocks]);

  // Handle selection change
  const handleSelectionChange = useCallback(
    (key: React.Key | null) => {
      if (key) {
        const selectedStock = stocks.find((stock) => stock.Id === key);
        if (selectedStock) {
          onSelectionChange(selectedStock.Id, selectedStock);
          // Set the search value to the selected stock name for display
          setSearchValue(selectedStock.Name);
        } else {
          onSelectionChange(null);
        }
      } else {
        onSelectionChange(null);
        setSearchValue("");
      }
    },
    [stocks, onSelectionChange]
  );

  // Handle input value change
  const handleInputChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

  // Get display value based on current value prop
  const displayValue = React.useMemo(() => {
    if (value && stocks.length > 0) {
      const selectedStock = stocks.find((stock) => stock.Id === value);
      return selectedStock?.Name || searchValue;
    }
    return searchValue;
  }, [value, stocks, searchValue]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Error display
  if (error && !isLoading && debouncedSearchValue.length >= minSearchLength) {
    return (
      <div className="space-y-2">
        <Autocomplete
          name={name}
          label={label}
          placeholder={placeholder}
          variant={variant}
          size={size}
          isRequired={isRequired}
          isInvalid={true}
          errorMessage={error}
          isDisabled={isDisabled}
          description={description}
          startContent={
            startContent || <FiDatabase className="h-4 w-4 text-default-400" />
          }
          inputValue={displayValue}
          onInputChange={handleInputChange}
          items={[]}
        >
          {() => <AutocompleteItem key="empty">No items</AutocompleteItem>}
        </Autocomplete>
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
      selectedKey={value || null}
      onSelectionChange={handleSelectionChange}
      isRequired={isRequired}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
      isDisabled={isDisabled}
      isLoading={isLoading}
      description={
        description ||
        (debouncedSearchValue.length > 0 &&
          debouncedSearchValue.length < minSearchLength &&
          `Type at least ${minSearchLength} characters to search`)
      }
      startContent={
        startContent || <FiDatabase className="h-4 w-4 text-default-400" />
      }
      inputValue={displayValue}
      onInputChange={handleInputChange}
      items={stocks}
      aria-labelledby="stock-autocomplete"
      allowsCustomValue={false}
      menuTrigger="input"
    >
      {(stock) => (
        <AutocompleteItem
          key={stock.Id}
          textValue={`${stock.Name} (${stock.Symbol || stock.Isin})`}
          className="py-2"
        >
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{stock.Name}</span>
            <div className="flex gap-2 text-xs text-default-500">
              {stock.Symbol && <span>Symbol: {stock.Symbol}</span>}
              {stock.Isin && <span>ISIN: {stock.Isin}</span>}
              {stock.Sector && <span>Sector: {stock.Sector}</span>}
            </div>
          </div>
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
};

export default StockAutocomplete;
