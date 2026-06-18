"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { FiMapPin } from "react-icons/fi";
import axiosInstance from "@/lib/axios";

interface Country {
  Id: number;
  Name: string;
  IsoCode: string;
  CountryCode: number;
  IsActive: boolean;
}

interface CountryAutocompleteProps {
  name: string;
  label: string;
  placeholder?: string;
  value?: number | string;
  onSelectionChange: (value: number | null) => void;
  variant?: "bordered" | "flat" | "faded" | "underlined";
  isRequired?: boolean;
  isInvalid?: boolean;
  errorMessage?: string;
  isDisabled?: boolean;
  description?: string;
  startContent?: React.ReactNode;
}

export const CountryAutocomplete: React.FC<CountryAutocompleteProps> = ({
  name,
  label,
  placeholder = "Search by name or code",
  value,
  onSelectionChange,
  variant = "bordered",
  isRequired = false,
  isInvalid = false,
  errorMessage,
  isDisabled = false,
  description,
  startContent,
}) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const response = await axiosInstance.get("/country?isActive=true");
        if (response.data.success && response.data.data) {
          setCountries(response.data.data);
        } else {
          setFetchError(response.data.message || "Failed to load countries");
        }
      } catch {
        setFetchError("Failed to load countries");
      } finally {
        setIsLoading(false);
      }
    };
    fetchCountries();
  }, []);

  // Sync display name when value or country list changes (edit mode)
  useEffect(() => {
    if (!value) {
      setInputValue("");
      return;
    }
    if (countries.length > 0) {
      const match = countries.find((c) => c.Id.toString() === value.toString());
      if (match) setInputValue(match.Name);
    }
  }, [value, countries]);

  const filteredCountries = useMemo(() => {
    const q = inputValue.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.Name.toLowerCase().includes(q) ||
        c.IsoCode.toLowerCase().includes(q) ||
        c.CountryCode?.toString().includes(q),
    );
  }, [countries, inputValue]);

  const handleSelectionChange = (key: React.Key | null) => {
    const country = key
      ? countries.find((c) => c.Id.toString() === key.toString())
      : null;
    setInputValue(country ? country.Name : "");
    onSelectionChange(country ? country.Id : null);
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    if (!val.trim()) onSelectionChange(null);
  };

  return (
    <Autocomplete
      name={name}
      label={label}
      placeholder={placeholder}
      variant={variant}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      selectedKey={value ? value.toString() : null}
      onSelectionChange={handleSelectionChange}
      isRequired={isRequired}
      isInvalid={isInvalid}
      errorMessage={fetchError ?? errorMessage}
      isDisabled={isDisabled}
      isLoading={isLoading}
      description={description}
      startContent={
        startContent || <FiMapPin className="h-4 w-4 text-default-400" />
      }
      items={filteredCountries}
      aria-label={label}
      listboxProps={{
        emptyContent: isLoading ? "Loading countries…" : "No countries found.",
      }}
    >
      {(country) => (
        <AutocompleteItem key={country.Id} textValue={country.Name}>
          <div className="flex items-center gap-2.5 py-0.5">
            <span className="bg-default-100 text-default-500 inline-flex w-18 shrink-0 items-center justify-center rounded py-0.5 font-mono text-[10px] font-semibold tracking-wider">
              {country.IsoCode}
              {country.CountryCode ? (
                <>
                  <span className="mx-0.5 text-default-300">|</span>+
                  {country.CountryCode}
                </>
              ) : null}
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">
                {country.Name}
              </span>
            </div>
          </div>
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
};

export default CountryAutocomplete;
