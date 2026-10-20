"use strict";

/**
 * Account Management Service
 * Hỗ trợ tìm kiếm, lọc và phân trang tài khoản.
 */

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function parsePositiveInteger(value, defaultValue, maxValue = Infinity) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const parsed = Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1
  ) {
    const error = new Error("Tham số phải là số nguyên dương");
    error.statusCode = 400;
    throw error;
  }

  return Math.min(parsed, maxValue);
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function searchAccounts(accounts, options = {}) {
  if (!Array.isArray(accounts)) {
    throw new TypeError("Danh sách tài khoản phải là một mảng");
  }

  const page = parsePositiveInteger(
    options.page,
    DEFAULT_PAGE
  );

  const limit = parsePositiveInteger(
    options.limit,
    DEFAULT_LIMIT,
    MAX_LIMIT
  );

  const keyword = normalize(options.keyword);
  const role = normalize(options.role);
  const status = normalize(options.status);

  const filtered = accounts.filter((account) => {
    if (!account || typeof account !== "object") {
      return false;
    }

    const searchableText = [
      account.name,
      account.fullName,
      account.username,
      account.email,
    ]
      .filter((value) => value !== undefined && value !== null)
      .join(" ")
      .toLowerCase();

    const matchesKeyword =
      !keyword || searchableText.includes(keyword);

    const accountRole = normalize(account.role);
    const matchesRole = !role || accountRole === role;

    const accountStatus = normalize(account.status);
    const matchesStatus =
      !status || accountStatus === status;

    return matchesKeyword && matchesRole && matchesStatus;
  });

  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
  const startIndex = (page - 1) * limit;

  return {
    data: filtered.slice(startIndex, startIndex + limit),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

module.exports = {
  searchAccounts,
};