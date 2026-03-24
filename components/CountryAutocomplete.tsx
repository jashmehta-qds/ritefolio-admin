"use client";

import React, { useEffect, useState } from "react";
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
  placeholder = "Search and select country",
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCountries = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await axiosInstance.get("/country?isActive=true");
        if (response.data.success && response.data.data) {
          setCountries(response.data.data);
        } else {
          setError(response.data.message || "Failed to load countries");
        }
      } catch {
        setError("Failed to load countries");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCountries();
  }, []);

  const handleSelectionChange = (key: React.Key | null) => {
    if (key) {
      const selected = countries.find((c) => c.Id.toString() === key);
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
          Error loading countries: {error}
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
      selectedKey={selectedKey}
      onSelectionChange={handleSelectionChange}
      isRequired={isRequired}
      isInvalid={isInvalid}
      errorMessage={errorMessage}
      isDisabled={isDisabled}
      isLoading={isLoading}
      description={description}
      startContent={
        startContent || <FiMapPin className="w-4 h-4 text-default-400" />
      }
      items={countries}
      listboxProps={{
        classNames: {
          list: "max-h-[200px] overflow-auto",
        },
      }}
    >
      {(country) => (
        <AutocompleteItem key={country.Id} textValue={country.Name}>
          <div className="flex flex-col">
            <span className="text-small font-medium">{country.Name}</span>
            <span className="text-tiny text-default-400">
              {country.IsoCode} • Code: {country.CountryCode}
            </span>
          </div>
        </AutocompleteItem>
      )}
    </Autocomplete>
  );
};

export default CountryAutocomplete;
