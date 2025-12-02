"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Input } from "@heroui/input";
import { Switch } from "@heroui/switch";
import { FiPlus, FiEdit2, FiTrash2 } from "react-icons/fi";
import { createClient } from "@/lib/supabase/client";
import axiosInstance from "@/lib/axios";
import { useFormik } from "formik";
import * as Yup from "yup";

interface Broker {
  Id: number;
  Name: string;
  ShortCode: string;
  IsBroker: boolean;
  IsDiscountBroker: boolean;
  IsActive: boolean;
  CreatedOn?: number;
  UpdatedOn?: number;
}

interface BrokerFormData {
  name: string;
  shortCode: string;
  isBroker: boolean;
  isDiscountBroker: boolean;
  isActive: boolean;
}

// Validation Schema
const brokerValidationSchema = Yup.object({
  name: Yup.string()
    .required("Broker name is required")
    .min(2, "Name must be at least 2 characters")
    .max(200, "Name must not exceed 200 characters"),
  shortCode: Yup.string()
    .required("Short code is required")
    .min(2, "Short code must be at least 2 characters")
    .max(50, "Short code must not exceed 50 characters")
    .matches(
      /^[A-Z0-9]+$/,
      "Short code must contain only uppercase letters and numbers"
    ),
  isBroker: Yup.boolean(),
  isDiscountBroker: Yup.boolean(),
  isActive: Yup.boolean(),
});

export default function BrokerPage() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<Broker | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const formik = useFormik<BrokerFormData>({
    initialValues: {
      name: "",
      shortCode: "",
      isBroker: true,
      isDiscountBroker: true,
      isActive: true,
    },
    validationSchema: brokerValidationSchema,
    onSubmit: async (values) => {
      try {
        const response = selectedBroker
          ? await axiosInstance.put(`/broker/${selectedBroker.Id}`, values)
          : await axiosInstance.post("/broker", values);

        const result = response.data;

        if (result.success) {
          handleCloseModal();
          fetchBrokers();
        } else {
          console.error("Failed to save broker:", result.error);
          alert(`Error: ${result.message || result.error}`);
        }
      } catch (error) {
        console.error("Error saving broker:", error);
        alert("Failed to save broker");
      }
    },
  });

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/");
        return;
      }

      fetchBrokers();
    };

    checkAuth();
  }, [router, supabase.auth]);

  const fetchBrokers = async () => {
    try {
      setIsLoading(true);
      const response = await axiosInstance.get("/broker");
      const result = response.data;

      if (result.success) {
        setBrokers(result.data);
      } else {
        console.error("Failed to fetch brokers:", result.error);
      }
    } catch (error) {
      console.error("Error fetching brokers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (broker?: Broker) => {
    if (broker) {
      setSelectedBroker(broker);
      formik.setValues({
        name: broker.Name,
        shortCode: broker.ShortCode,
        isBroker: broker.IsBroker,
        isDiscountBroker: broker.IsDiscountBroker,
        isActive: broker.IsActive,
      });
    } else {
      setSelectedBroker(null);
      formik.resetForm();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBroker(null);
    formik.resetForm();
  };

  const handleDelete = async () => {
    if (!selectedBroker) return;

    try {
      setIsDeleting(true);

      const response = await axiosInstance.delete(
        `/broker/${selectedBroker.Id}`
      );
      const result = response.data;

      if (result.success) {
        setIsDeleteModalOpen(false);
        setSelectedBroker(null);
        fetchBrokers();
      } else {
        console.error("Failed to delete broker:", result.error);
        alert(`Error: ${result.message || result.error}`);
      }
    } catch (error) {
      console.error("Error deleting broker:", error);
      alert("Failed to delete broker");
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (broker: Broker) => {
    setSelectedBroker(broker);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedBroker(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-default-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">
              Stock Broker
            </h1>
            <p className="mt-2 text-default-500">
              Manage stock broker master data
            </p>
          </div>
          <Button
            color="primary"
            startContent={<FiPlus className="text-lg" />}
            onPress={() => handleOpenModal()}
          >
            Add Broker
          </Button>
        </div>

        {/* Broker Table */}
        <Table
          aria-label="Broker table"
          className="max-h-[70vh] overflow-auto"
          isHeaderSticky
        >
          <TableHeader>
            <TableColumn>ID</TableColumn>
            <TableColumn>NAME</TableColumn>
            <TableColumn>SHORT CODE</TableColumn>
            <TableColumn>IS BROKER</TableColumn>
            <TableColumn>IS DISCOUNT BROKER</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>ACTIONS</TableColumn>
          </TableHeader>
          <TableBody>
            {brokers.map((broker) => (
              <TableRow key={broker.Id}>
                <TableCell>{broker.Id}</TableCell>
                <TableCell>{broker.Name}</TableCell>
                <TableCell>{broker.ShortCode}</TableCell>
                <TableCell>
                  <Chip
                    color={broker.IsBroker ? "success" : "default"}
                    size="sm"
                    variant="flat"
                  >
                    {broker.IsBroker ? "Yes" : "No"}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Chip
                    color={broker.IsDiscountBroker ? "success" : "default"}
                    size="sm"
                    variant="flat"
                  >
                    {broker.IsDiscountBroker ? "Yes" : "No"}
                  </Chip>
                </TableCell>
                <TableCell>
                  <Chip
                    color={broker.IsActive ? "success" : "default"}
                    size="sm"
                    variant="flat"
                  >
                    {broker.IsActive ? "Active" : "Inactive"}
                  </Chip>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="light"
                      color="primary"
                      isIconOnly
                      onPress={() => handleOpenModal(broker)}
                    >
                      <FiEdit2 />
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      isIconOnly
                      onPress={() => openDeleteModal(broker)}
                    >
                      <FiTrash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Add/Edit Modal */}
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} size="2xl">
          <ModalContent>
            <form onSubmit={formik.handleSubmit}>
              <ModalHeader>
                {selectedBroker ? "Edit Broker" : "Add Broker"}
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    label="Broker Name"
                    placeholder="Enter broker name"
                    name="name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    isInvalid={formik.touched.name && !!formik.errors.name}
                    errorMessage={formik.touched.name && formik.errors.name}
                    isRequired
                  />
                  <Input
                    label="Short Code"
                    placeholder="Enter short code (e.g., ZERODHA, ICICIDIRECT)"
                    name="shortCode"
                    value={formik.values.shortCode}
                    onChange={(e) => {
                      formik.setFieldValue(
                        "shortCode",
                        e.target.value.toUpperCase()
                      );
                    }}
                    onBlur={formik.handleBlur}
                    isInvalid={
                      formik.touched.shortCode && !!formik.errors.shortCode
                    }
                    errorMessage={
                      formik.touched.shortCode && formik.errors.shortCode
                    }
                    isRequired
                  />
                  <div className="flex gap-4">
                    <Switch
                      name="isBroker"
                      isSelected={formik.values.isBroker}
                      onValueChange={(value) =>
                        formik.setFieldValue("isBroker", value)
                      }
                    >
                      Is Broker
                    </Switch>
                    <Switch
                      name="isDiscountBroker"
                      isSelected={formik.values.isDiscountBroker}
                      onValueChange={(value) =>
                        formik.setFieldValue("isDiscountBroker", value)
                      }
                    >
                      Is Discount Broker
                    </Switch>
                  </div>
                  <Switch
                    name="isActive"
                    isSelected={formik.values.isActive}
                    onValueChange={(value) =>
                      formik.setFieldValue("isActive", value)
                    }
                  >
                    Active
                  </Switch>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={handleCloseModal}>
                  Cancel
                </Button>
                <Button
                  color="primary"
                  type="submit"
                  isLoading={formik.isSubmitting}
                >
                  {selectedBroker ? "Update" : "Create"}
                </Button>
              </ModalFooter>
            </form>
          </ModalContent>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal isOpen={isDeleteModalOpen} onClose={closeDeleteModal}>
          <ModalContent>
            <ModalHeader>Confirm Delete</ModalHeader>
            <ModalBody>
              <p>
                Are you sure you want to delete the broker{" "}
                <strong>{selectedBroker?.Name}</strong>?
              </p>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={closeDeleteModal}>
                Cancel
              </Button>
              <Button
                color="danger"
                onPress={handleDelete}
                isLoading={isDeleting}
              >
                Delete
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
