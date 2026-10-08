"use client";

import { useEffect, useState } from "react";
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
import { Pagination } from "@heroui/pagination";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import { Switch } from "@heroui/switch";
import { Tooltip } from "@heroui/tooltip";
import { FiEdit2, FiEye, FiSearch, FiShield } from "react-icons/fi";
import axiosInstance from "@/lib/axios";
import { dateStringToUtcEpoch, formatEpochDate } from "@/utils/date";

type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "NONE";

interface Plan {
  Id: number;
  Key: string;
  Name: string;
  IsActive: boolean | null;
}

interface UserSubscription {
  UserId: string;
  Email: string | null;
  FullName: string | null;
  Provider: string | null;
  IsAdmin: boolean;
  SignedUpOn: number | null;
  LastSignInOn: number | null;
  ProfileCount: number;
  SubscriptionId: string | null;
  SubscribedPlanId: number | null;
  SubscribedPlanName: string | null;
  EffectivePlanId: number;
  EffectivePlanName: string | null;
  SubscriptionStatus: SubscriptionStatus;
  SubscribedOn: number | null;
  ExpiresAt: number | null;
}

interface SubscriptionHistory {
  Id: string;
  PlanId: number;
  PlanName: string | null;
  IsActive: boolean;
  ExpiresAt: number | null;
  CreatedOn: number;
  UpdatedOn: number | null;
}

interface UserOrder {
  Id: string;
  OrderType: "PLAN" | "ADDON";
  PlanName: string | null;
  BillingCycle: string | null;
  BlockSize: number | null;
  Amount: string;
  Currency: string;
  Status: string;
  CreatedOn: number;
}

const PAGE_SIZE = 50;

const STATUS_OPTIONS: { key: SubscriptionStatus; label: string }[] = [
  { key: "ACTIVE", label: "Active" },
  { key: "EXPIRED", label: "Expired" },
  { key: "NONE", label: "No subscription" },
];

const STATUS_CHIP: Record<
  SubscriptionStatus,
  { label: string; color: "success" | "danger" | "default" }
> = {
  ACTIVE: { label: "Active", color: "success" },
  EXPIRED: { label: "Expired", color: "danger" },
  NONE: { label: "Default (Free)", color: "default" },
};

const PLAN_CHIP_COLOR: Record<
  number,
  "default" | "success" | "secondary" | "warning"
> = {
  0: "default",
  1: "success",
  2: "secondary",
  3: "warning",
};

const ORDER_STATUS_COLOR: Record<
  string,
  "success" | "warning" | "danger" | "default"
> = {
  PAID: "success",
  PENDING: "warning",
  FAILED: "danger",
  EXPIRED: "default",
};

function formatAmount(amount: string, currency: string) {
  const value = Number(amount);
  if (isNaN(value)) return amount;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserSubscription[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPlanId, setFilterPlanId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const [selectedUser, setSelectedUser] = useState<UserSubscription | null>(
    null,
  );
  const [history, setHistory] = useState<SubscriptionHistory[]>([]);
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Change plan (e.g. grant Internal to staff)
  const [planTarget, setPlanTarget] = useState<UserSubscription | null>(null);
  const [newPlanId, setNewPlanId] = useState("");
  const [neverExpires, setNeverExpires] = useState(true);
  const [expiryDate, setExpiryDate] = useState("");
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planChangeError, setPlanChangeError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // One-click "Grant Internal" (staff accounts): never-expiring Internal plan
  const [grantTarget, setGrantTarget] = useState<UserSubscription | null>(
    null,
  );
  const [isGranting, setIsGranting] = useState(false);
  const [grantError, setGrantError] = useState<string | null>(null);
  const internalPlan = plans.find(
    (plan) => plan.Key === "internal" && plan.IsActive !== false,
  );

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axiosInstance.get("/plans");
        if (response.data.success) setPlans(response.data.data);
      } catch (err) {
        console.error("Error fetching plans:", err);
      }
    };
    fetchPlans();
  }, []);

  // Debounce the search box so every keystroke doesn't hit the API
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;

    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await axiosInstance.get("/users", {
          params: {
            page: currentPage,
            limit: PAGE_SIZE,
            search: searchTerm || undefined,
            planId: filterPlanId || undefined,
            status: filterStatus || undefined,
          },
        });
        if (cancelled) return;
        if (response.data.success) {
          setUsers(response.data.data);
          setTotalPages(response.data.pagination.totalPages);
          setTotalUsers(response.data.pagination.total);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Error fetching users:", err);
        setError("Failed to load users. Please try again.");
        setUsers([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, [currentPage, searchTerm, filterPlanId, filterStatus, reloadKey]);

  const openDetails = async (user: UserSubscription) => {
    setSelectedUser(user);
    setHistory([]);
    setOrders([]);
    setHistoryError(null);
    setIsHistoryLoading(true);
    try {
      const response = await axiosInstance.get(
        `/users/${user.UserId}/subscriptions`,
      );
      if (response.data.success) {
        setHistory(response.data.data.subscriptions);
        setOrders(response.data.data.orders);
      }
    } catch (err) {
      console.error("Error fetching subscription history:", err);
      setHistoryError("Failed to load subscription history.");
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const closeDetails = () => setSelectedUser(null);

  const openChangePlan = (user: UserSubscription) => {
    setSelectedUser(null);
    setPlanTarget(user);
    setNewPlanId(user.EffectivePlanId.toString());
    setNeverExpires(user.ExpiresAt === null);
    setExpiryDate(
      user.ExpiresAt
        ? new Date(user.ExpiresAt * 1000).toISOString().slice(0, 10)
        : "",
    );
    setPlanChangeError(null);
  };

  const closeChangePlan = () => {
    if (!isSavingPlan) setPlanTarget(null);
  };

  const handleChangePlan = async () => {
    if (!planTarget) return;
    if (newPlanId === "") {
      setPlanChangeError("Select a plan.");
      return;
    }
    let expiresAt: number | null = null;
    if (!neverExpires) {
      if (!expiryDate) {
        setPlanChangeError("Pick an expiry date, or turn on Never expires.");
        return;
      }
      // End of the chosen day (UTC), so the plan stays active through that date.
      expiresAt = dateStringToUtcEpoch(expiryDate) + 86399;
      if (expiresAt <= Math.floor(Date.now() / 1000)) {
        setPlanChangeError("Expiry date must be in the future.");
        return;
      }
    }

    setIsSavingPlan(true);
    setPlanChangeError(null);
    try {
      const response = await axiosInstance.post(
        `/users/${planTarget.UserId}/subscriptions`,
        { planId: Number(newPlanId), expiresAt },
      );
      setSuccessMessage(
        `${planTarget.Email ?? "User"}: ${response.data.message ?? "plan changed"}`,
      );
      setPlanTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error("Error changing plan:", err);
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Failed to change plan.";
      setPlanChangeError(message);
    } finally {
      setIsSavingPlan(false);
    }
  };

  const isInternalUser = (user: UserSubscription) =>
    internalPlan !== undefined &&
    user.SubscriptionStatus === "ACTIVE" &&
    user.EffectivePlanId === internalPlan.Id;

  const openGrantInternal = (user: UserSubscription) => {
    setGrantTarget(user);
    setGrantError(null);
  };

  const closeGrantInternal = () => {
    if (!isGranting) setGrantTarget(null);
  };

  const handleGrantInternal = async () => {
    if (!grantTarget || !internalPlan) return;
    setIsGranting(true);
    setGrantError(null);
    try {
      const response = await axiosInstance.post(
        `/users/${grantTarget.UserId}/subscriptions`,
        { planId: internalPlan.Id, expiresAt: null },
      );
      setSuccessMessage(
        `${grantTarget.Email ?? "User"}: ${response.data.message ?? "Internal plan granted"}`,
      );
      setGrantTarget(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      console.error("Error granting Internal plan:", err);
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Failed to grant the Internal plan.";
      setGrantError(message);
    } finally {
      setIsGranting(false);
    }
  };

  const renderPlanChip = (planId: number, planName: string | null) => (
    <Chip
      color={PLAN_CHIP_COLOR[planId] ?? "default"}
      size="sm"
      variant="flat"
    >
      {planName ?? `Plan ${planId}`}
    </Chip>
  );

  const renderStatusChip = (status: SubscriptionStatus) => (
    <Chip color={STATUS_CHIP[status].color} size="sm" variant="dot">
      {STATUS_CHIP[status].label}
    </Chip>
  );

  return (
    <div className="p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Users</h1>
            <p className="mt-2 text-default-500">
              Registered users and their subscriptions
            </p>
          </div>
          <p className="text-sm text-default-500">
            {totalUsers.toLocaleString("en-IN")} user
            {totalUsers === 1 ? "" : "s"}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px_200px]">
          <Input
            aria-label="Search users"
            placeholder="Search by email, name or user id"
            value={searchInput}
            onValueChange={setSearchInput}
            startContent={<FiSearch className="text-default-400" />}
            isClearable
            onClear={() => setSearchInput("")}
          />
          <Select
            aria-label="Filter by plan"
            placeholder="All plans"
            selectedKeys={filterPlanId ? [filterPlanId] : []}
            onSelectionChange={(keys) => {
              setFilterPlanId((Array.from(keys)[0] as string) ?? "");
              setCurrentPage(1);
            }}
          >
            {plans.map((plan) => (
              <SelectItem key={plan.Id.toString()}>{plan.Name}</SelectItem>
            ))}
          </Select>
          <Select
            aria-label="Filter by subscription status"
            placeholder="All statuses"
            selectedKeys={filterStatus ? [filterStatus] : []}
            onSelectionChange={(keys) => {
              setFilterStatus((Array.from(keys)[0] as string) ?? "");
              setCurrentPage(1);
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.key}>{option.label}</SelectItem>
            ))}
          </Select>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 flex items-center justify-between gap-4 rounded-lg bg-success-50 px-4 py-3 text-sm text-success">
            <span>{successMessage}</span>
            <Button
              size="sm"
              variant="light"
              color="success"
              onPress={() => setSuccessMessage(null)}
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Users Table */}
        <Table
          aria-label="Users table"
          isHeaderSticky
          className="glass-card rounded-xl shadow-lg overflow-hidden"
          classNames={{
            wrapper: "max-h-[calc(100vh-320px)] p-0",
            base: "p-0",
            th: "text-xs sm:text-sm",
            td: "text-xs sm:text-sm py-2",
          }}
          bottomContent={
            totalPages > 1 ? (
              <div className="flex w-full justify-center py-2">
                <Pagination
                  showControls
                  page={currentPage}
                  total={totalPages}
                  onChange={setCurrentPage}
                />
              </div>
            ) : null
          }
        >
          <TableHeader>
            <TableColumn>USER</TableColumn>
            <TableColumn>PLAN</TableColumn>
            <TableColumn>STATUS</TableColumn>
            <TableColumn>SUBSCRIBED ON</TableColumn>
            <TableColumn>EXPIRES ON</TableColumn>
            <TableColumn>PROFILES</TableColumn>
            <TableColumn>SIGNED UP</TableColumn>
            <TableColumn>LAST SIGN-IN</TableColumn>
            <TableColumn>ACTIONS</TableColumn>
          </TableHeader>
          <TableBody
            isLoading={isLoading}
            loadingContent={<Spinner label="Loading..." />}
            emptyContent={isLoading ? " " : "No users found"}
          >
            {users.map((user) => (
              <TableRow key={user.UserId}>
                <TableCell>
                  <div className="flex min-w-0 flex-col">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-foreground">
                        {user.FullName || "—"}
                      </span>
                      {user.IsAdmin && (
                        <Chip color="primary" size="sm" variant="flat">
                          Admin
                        </Chip>
                      )}
                    </div>
                    <span className="truncate text-default-500">
                      {user.Email ?? "—"}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {renderPlanChip(
                      user.EffectivePlanId,
                      user.EffectivePlanName,
                    )}
                    {user.SubscriptionStatus === "EXPIRED" &&
                      user.SubscribedPlanId !== null && (
                        <Tooltip
                          content={`${user.SubscribedPlanName ?? "Paid"} plan expired; user is on Free`}
                        >
                          <span className="text-default-400 line-through">
                            {user.SubscribedPlanName}
                          </span>
                        </Tooltip>
                      )}
                  </div>
                </TableCell>
                <TableCell>
                  {renderStatusChip(user.SubscriptionStatus)}
                </TableCell>
                <TableCell>{formatEpochDate(user.SubscribedOn)}</TableCell>
                <TableCell>
                  {user.SubscriptionId && user.ExpiresAt === null
                    ? "Never"
                    : formatEpochDate(user.ExpiresAt)}
                </TableCell>
                <TableCell>{user.ProfileCount}</TableCell>
                <TableCell>{formatEpochDate(user.SignedUpOn)}</TableCell>
                <TableCell>{formatEpochDate(user.LastSignInOn, true)}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Tooltip content="View subscriptions">
                      <Button
                        size="sm"
                        variant="light"
                        isIconOnly
                        onPress={() => openDetails(user)}
                        aria-label="View subscriptions"
                      >
                        <FiEye className="text-lg" />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Change plan">
                      <Button
                        size="sm"
                        variant="light"
                        isIconOnly
                        onPress={() => openChangePlan(user)}
                        aria-label="Change plan"
                      >
                        <FiEdit2 className="text-lg" />
                      </Button>
                    </Tooltip>
                    {internalPlan && (
                      <Tooltip
                        content={
                          isInternalUser(user)
                            ? "Already on the Internal plan"
                            : "Grant Internal"
                        }
                      >
                        {/* span keeps the tooltip working on a disabled button */}
                        <span>
                          <Button
                            size="sm"
                            variant="light"
                            color="warning"
                            isIconOnly
                            isDisabled={isInternalUser(user)}
                            onPress={() => openGrantInternal(user)}
                            aria-label="Grant Internal"
                          >
                            <FiShield className="text-lg" />
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Subscription Details Modal */}
        <Modal
          isOpen={selectedUser !== null}
          onClose={closeDetails}
          size="4xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            {selectedUser && (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <span>{selectedUser.FullName || selectedUser.Email}</span>
                  {selectedUser.FullName && (
                    <span className="text-sm font-normal text-default-500">
                      {selectedUser.Email}
                    </span>
                  )}
                </ModalHeader>
                <ModalBody>
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4 rounded-lg bg-default-50 p-4 text-sm md:grid-cols-4">
                    <div>
                      <p className="text-default-500">Current plan</p>
                      <div className="mt-1">
                        {renderPlanChip(
                          selectedUser.EffectivePlanId,
                          selectedUser.EffectivePlanName,
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-default-500">Status</p>
                      <div className="mt-1">
                        {renderStatusChip(selectedUser.SubscriptionStatus)}
                      </div>
                    </div>
                    <div>
                      <p className="text-default-500">Sign-in provider</p>
                      <p className="mt-1 font-medium capitalize">
                        {selectedUser.Provider ?? "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-default-500">User ID</p>
                      <p className="mt-1 break-all font-mono text-xs">
                        {selectedUser.UserId}
                      </p>
                    </div>
                  </div>

                  {isHistoryLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner label="Loading..." />
                    </div>
                  ) : historyError ? (
                    <div className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger">
                      {historyError}
                    </div>
                  ) : (
                    <>
                      <h3 className="mt-2 text-lg font-semibold">
                        Subscription history
                      </h3>
                      <Table
                        aria-label="Subscription history"
                        removeWrapper
                        classNames={{ th: "text-xs", td: "text-xs py-2" }}
                      >
                        <TableHeader>
                          <TableColumn>PLAN</TableColumn>
                          <TableColumn>STATE</TableColumn>
                          <TableColumn>STARTED ON</TableColumn>
                          <TableColumn>EXPIRES ON</TableColumn>
                          <TableColumn>ENDED ON</TableColumn>
                        </TableHeader>
                        <TableBody emptyContent="No subscriptions — user is on the Free plan by default">
                          {history.map((sub) => (
                            <TableRow key={sub.Id}>
                              <TableCell>
                                {renderPlanChip(sub.PlanId, sub.PlanName)}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  color={sub.IsActive ? "success" : "default"}
                                  size="sm"
                                  variant="flat"
                                >
                                  {sub.IsActive ? "Current" : "Superseded"}
                                </Chip>
                              </TableCell>
                              <TableCell>
                                {formatEpochDate(sub.CreatedOn, true)}
                              </TableCell>
                              <TableCell>
                                {sub.ExpiresAt === null
                                  ? "Never"
                                  : formatEpochDate(sub.ExpiresAt)}
                              </TableCell>
                              <TableCell>
                                {sub.IsActive
                                  ? "—"
                                  : formatEpochDate(sub.UpdatedOn, true)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      <h3 className="mt-4 text-lg font-semibold">Orders</h3>
                      <Table
                        aria-label="Payment orders"
                        removeWrapper
                        classNames={{ th: "text-xs", td: "text-xs py-2" }}
                      >
                        <TableHeader>
                          <TableColumn>TYPE</TableColumn>
                          <TableColumn>DETAILS</TableColumn>
                          <TableColumn>AMOUNT</TableColumn>
                          <TableColumn>STATUS</TableColumn>
                          <TableColumn>CREATED ON</TableColumn>
                        </TableHeader>
                        <TableBody emptyContent="No orders">
                          {orders.map((order) => (
                            <TableRow key={order.Id}>
                              <TableCell>
                                {order.OrderType === "PLAN"
                                  ? "Plan"
                                  : "Add-on"}
                              </TableCell>
                              <TableCell>
                                {order.OrderType === "PLAN"
                                  ? `${order.PlanName ?? "—"} (${order.BillingCycle ?? "—"})`
                                  : `${(order.BlockSize ?? 0).toLocaleString("en-IN")} transactions`}
                              </TableCell>
                              <TableCell>
                                {formatAmount(order.Amount, order.Currency)}
                              </TableCell>
                              <TableCell>
                                <Chip
                                  color={
                                    ORDER_STATUS_COLOR[order.Status] ??
                                    "default"
                                  }
                                  size="sm"
                                  variant="flat"
                                >
                                  {order.Status}
                                </Chip>
                              </TableCell>
                              <TableCell>
                                {formatEpochDate(order.CreatedOn, true)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={closeDetails}>
                    Close
                  </Button>
                  <Button
                    color="primary"
                    startContent={<FiEdit2 />}
                    onPress={() => openChangePlan(selectedUser)}
                  >
                    Change plan
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Change Plan Modal */}
        <Modal isOpen={planTarget !== null} onClose={closeChangePlan}>
          <ModalContent>
            {planTarget && (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <span>Change plan</span>
                  <span className="text-sm font-normal text-default-500">
                    {planTarget.Email}
                  </span>
                </ModalHeader>
                <ModalBody>
                  <div className="space-y-4">
                    <p className="text-sm text-default-500">
                      Current plan:{" "}
                      <span className="font-medium text-foreground">
                        {planTarget.EffectivePlanName ?? "Free"}
                      </span>
                      . The current subscription is ended and the new plan
                      starts immediately.
                    </p>
                    <Select
                      label="New plan"
                      selectedKeys={newPlanId ? [newPlanId] : []}
                      onSelectionChange={(keys) =>
                        setNewPlanId((Array.from(keys)[0] as string) ?? "")
                      }
                      isRequired
                    >
                      {plans
                        .filter((plan) => plan.IsActive !== false)
                        .map((plan) => (
                          <SelectItem key={plan.Id.toString()}>
                            {plan.Name}
                          </SelectItem>
                        ))}
                    </Select>
                    <Switch
                      isSelected={neverExpires}
                      onValueChange={setNeverExpires}
                    >
                      Never expires
                    </Switch>
                    {!neverExpires && (
                      <Input
                        type="date"
                        label="Expires on"
                        value={expiryDate}
                        onValueChange={setExpiryDate}
                        min={new Date().toISOString().slice(0, 10)}
                        isRequired
                      />
                    )}
                    {planChangeError && (
                      <div className="rounded-lg bg-danger-50 px-4 py-3 text-sm text-danger">
                        {planChangeError}
                      </div>
                    )}
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button
                    variant="light"
                    onPress={closeChangePlan}
                    isDisabled={isSavingPlan}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="primary"
                    onPress={handleChangePlan}
                    isLoading={isSavingPlan}
                  >
                    Save
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* Grant Internal Confirmation Modal */}
        <Modal isOpen={grantTarget !== null} onClose={closeGrantInternal}>
          <ModalContent>
            {grantTarget && (
              <>
                <ModalHeader>Grant Internal plan</ModalHeader>
                <ModalBody>
                  <div className="space-y-3 text-sm">
                    <p>
                      Give <strong>{grantTarget.Email}</strong> the Internal
                      plan? It never expires and includes every feature with
                      unlimited transactions.
                    </p>
                    {grantTarget.SubscriptionStatus === "ACTIVE" &&
                      grantTarget.EffectivePlanId !== 0 && (
                        <div className="rounded-lg bg-warning-50 px-4 py-3 text-warning-700">
                          This replaces their current{" "}
                          <strong>{grantTarget.EffectivePlanName}</strong>{" "}
                          subscription
                          {grantTarget.ExpiresAt
                            ? ` (expires ${formatEpochDate(grantTarget.ExpiresAt)})`
                            : ""}
                          .
                        </div>
                      )}
                    {grantError && (
                      <div className="rounded-lg bg-danger-50 px-4 py-3 text-danger">
                        {grantError}
                      </div>
                    )}
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button
                    variant="light"
                    onPress={closeGrantInternal}
                    isDisabled={isGranting}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="warning"
                    startContent={!isGranting && <FiShield />}
                    onPress={handleGrantInternal}
                    isLoading={isGranting}
                  >
                    Grant Internal
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
