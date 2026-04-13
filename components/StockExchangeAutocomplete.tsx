"use client";

import React, { useEffect, useState } from "react";
import { Select, SelectItem } from "@heroui/select";
import { Chip } from "@heroui/chip";
import { FiTrendingUp } from "react-icons/fi";
import axiosInstance from "@/lib/axios";

interface Exchange {
  Id: number;
  Name: string;
  ExchangeCode: string;
  CountryId: number;
}

interface StockExchangeAutocompleteProps {
  label?: string;
  placeholder?: string;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  countryId?: number | string | null;
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  isDisabled?: boolean;
}

export const StockExchangeAutocomplete: React.FC<
  StockExchangeAutocompleteProps
> = ({
  label = "Stock Exchanges",
  placeholder = "Select stock exchanges",
  selectedIds,
  onSelectionChange,
  countryId,
  isRequired = false,
  isInvalid = false,
  errorMessage,
  isDisabled = false,
}) => {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchExchanges = async () => {
      setIsLoading(true);
      try {
        const response = await axiosInstance.get("/exchange");
        if (response.data.success) {
          setExchanges(response.data.data);
        }
      } catch (err) {
        console.error("Error fetching exchanges:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchExchanges();
  }, []);

  const items = countryId
    ? exchanges.filter((e) => e.CountryId === Number(countryId))
    : exchanges;

  return (
    <Select
      label={label}
      placeholder={isLoading ? "Loading exchanges..." : placeholder}
      selectionMode="multiple"
      selectedKeys={new Set(selectedIds.map(String))}
      onSelectionChange={(keys) => {
        if (keys === "all") return;
        onSelectionChange(Array.from(keys as Set<string>).map(Number));
      }}
      isRequired={isRequired}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
      isDisabled={isDisabled || isLoading}
      startContent={
        <FiTrendingUp className="w-4 h-4 text-default-400 shrink-0" />
      }
      renderValue={(items) => (
        <div className="flex flex-wrap gap-1 py-0.5">
          {items.map((item) => (
            <Chip key={item.key} size="sm" variant="flat" color="primary">
              {item.textValue}
            </Chip>
          ))}
        </div>
      )}
    >
      {items.map((exchange) => (
        <SelectItem
          key={exchange.Id.toString()}
          textValue={exchange.ExchangeCode}
        >
          <div className="flex flex-col">
            <span className="font-medium text-sm">{exchange.ExchangeCode}</span>
            <span className="text-xs text-default-400">{exchange.Name}</span>
          </div>
        </SelectItem>
      ))}
    </Select>
  );
};

export default StockExchangeAutocomplete;
