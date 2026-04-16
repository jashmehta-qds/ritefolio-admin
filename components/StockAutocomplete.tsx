"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Chip } from "@heroui/chip";
import { FiDatabase } from "react-icons/fi";
import axiosInstance from "@/lib/axios";

export interface Stock {
  Id: string;
  Name: string;
  Symbol: string;
  Isin: string;
  BseCode: string | null;
  Sector: string | null;
  MacroSector: string | null;
  Industry: string | null;
  Listed: boolean;
  Status: string | null;
  FaceValue?: number | null;
}

const formatStockLabel = (stock: Stock): string =>
  stock.FaceValue
    ? `${stock.Name} - FV(${parseFloat(stock.FaceValue.toString())})`
    : stock.Name;

interface StockAutocompleteProps {
  name: string;
  label: string;
  placeholder?: string;
  value?: string;
  onSelectionChange: (stockId: string | null, stock?: Stock) => void;
  variant?: "bordered" | "flat" | "faded" | "underlined";
  size?: "sm" | "md" | "lg";
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  isDisabled?: boolean;
  description?: string;
  startContent?: React.ReactNode;
  investmentTypeIds?: number[];
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
  investmentTypeIds,
  sector,
  minSearchLength = 2,
  maxResults = 50,
  initialStockName,
}) => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState(initialStockName || ""); // display value in input
  const [searchQuery, setSearchQuery] = useState(initialStockName || ""); // actual API search term
  const [debouncedSearchValue, setDebouncedSearchValue] = useState("");

  const debounceTimeoutRef = useRef<NodeJS.Timeout>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (initialStockName) {
      setSearchValue(initialStockName);
      setSearchQuery(initialStockName);
    }
  }, [initialStockName]);

  // Debounce the search query (not the display value)
  useEffect(() => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(
      () => setDebouncedSearchValue(searchQuery),
      300,
    );
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, [searchQuery]);

  const searchStocks = useCallback(
    async (searchTerm: string) => {
      if (abortControllerRef.current) abortControllerRef.current.abort();

      if (!searchTerm || searchTerm.length < minSearchLength) {
        setStocks([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        abortControllerRef.current = new AbortController();

        const params = new URLSearchParams();
        params.append("search", searchTerm);
        params.append("isActive", "true");
        params.append("limit", maxResults.toString());
        investmentTypeIds?.forEach((id) =>
          params.append("investmentTypeId", id.toString()),
        );
        if (sector) params.append("sector", sector);

        const response = await axiosInstance.get(
          `/stocks?${params.toString()}`,
          {
            signal: abortControllerRef.current.signal,
          },
        );

        if (abortControllerRef.current.signal.aborted) return;

        if (response.data.success && response.data.data) {
          setStocks(response.data.data);
        } else {
          setError(response.data.message || "Failed to search stocks");
          setStocks([]);
        }
      } catch (err: any) {
        if (abortControllerRef.current?.signal.aborted) return;
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Failed to search stocks",
        );
        setStocks([]);
      } finally {
        if (!abortControllerRef.current?.signal.aborted) setIsLoading(false);
      }
    },
    [investmentTypeIds, sector, minSearchLength, maxResults],
  );

  useEffect(() => {
    searchStocks(debouncedSearchValue);
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [debouncedSearchValue, searchStocks]);

  const handleSelectionChange = useCallback(
    (key: React.Key | null) => {
      if (key) {
        const selected = stocks.find((s) => s.Id.toString() === key);
        if (selected) {
          onSelectionChange(selected.Id, selected);
          setSearchValue(formatStockLabel(selected)); // display: "Name - FV(10)"
          setSearchQuery(selected.Name);              // search: plain name only
        } else {
          onSelectionChange(null);
        }
      } else {
        onSelectionChange(null);
        setSearchValue("");
        setSearchQuery("");
      }
    },
    [stocks, onSelectionChange],
  );

  const handleInputChange = useCallback((value: string) => {
    setSearchValue(value);
    setSearchQuery(value); // user is typing — display and search stay in sync
  }, []);

  const displayValue = React.useMemo(() => {
    if (value && stocks.length > 0) {
      const selected = stocks.find((s) => s.Id.toString() === value.toString());
      return selected ? formatStockLabel(selected) : searchValue;
    }
    return searchValue;
  }, [value, stocks, searchValue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const sharedProps = {
    name,
    label,
    placeholder,
    variant,
    size,
    isRequired,
    isDisabled,
    description,
    startContent: startContent || (
      <FiDatabase className="w-4 h-4 text-default-400" />
    ),
    inputValue: displayValue,
    onInputChange: handleInputChange,
  };

  if (error && !isLoading && debouncedSearchValue.length >= minSearchLength) {
    return (
      <Autocomplete {...sharedProps} isInvalid errorMessage={error} items={[]}>
        {() => <AutocompleteItem key="empty">No items</AutocompleteItem>}
      </Autocomplete>
    );
  }

  return (
    <Autocomplete
      {...sharedProps}
      selectedKey={value ? value.toString() : null}
      onSelectionChange={handleSelectionChange}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
      isLoading={isLoading}
      description={
        description ||
        (debouncedSearchValue.length > 0 &&
          debouncedSearchValue.length < minSearchLength &&
          `Type at least ${minSearchLength} characters to search`)
      }
      items={stocks}
      aria-labelledby="stock-autocomplete"
      allowsCustomValue={false}
      menuTrigger="input"
    >
      {(stock) => (
        <AutocompleteItem
          key={stock.Id}
          textValue={stock.Name}
          className="py-2"
        >
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {stock.Name}
              {stock.FaceValue && (
                <>
                  <span> - </span>
                  <span>FV({parseFloat(stock.FaceValue.toString())})</span>
                </>
              )}
            </span>
            <div className="flex items-center gap-2 text-xs text-default-500">
              {stock.Symbol && <span>Symbol: {stock.Symbol}</span>}
              {stock.Isin && <span>ISIN: {stock.Isin}</span>}
              {stock.Sector && <span>Sector: {stock.Sector}</span>}
              {stock.Status && (
                <Chip
                  size="sm"
                  variant="dot"
                  color={stock.Status === "Active" ? "success" : "danger"}
                >
                  {stock.Status}
                </Chip>
              )}
            </div>
          </div>
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
};

export default StockAutocomplete;
