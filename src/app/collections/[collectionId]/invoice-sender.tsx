"use client";

import { FileText, Link2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { sendInvoicesAction } from "@/app/collections/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type CollectionInvoicePayerRow = {
  id: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  externalId: string | null;
  amountLabel: string;
  invoice: {
    id: number;
    invoiceNumber: string;
    status: string;
    publicPath: string;
  } | null;
};

type CollectionInvoiceSenderProps = {
  collectionId: number;
  rows: CollectionInvoicePayerRow[];
};

function getStatusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function CollectionInvoiceSender({
  collectionId,
  rows,
}: CollectionInvoiceSenderProps) {
  const selectableIds = useMemo(
    () => rows.filter((row) => !row.invoice).map((row) => row.id),
    [rows],
  );
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelectableSelected =
    selectableIds.length > 0 && selectedIds.length === selectableIds.length;

  function togglePayer(payerId: number, checked: boolean) {
    setSelectedIds((currentIds) => {
      if (checked) {
        return currentIds.includes(payerId)
          ? currentIds
          : [...currentIds, payerId];
      }

      return currentIds.filter((currentId) => currentId !== payerId);
    });
  }

  function toggleAll() {
    setSelectedIds(allSelectableSelected ? [] : selectableIds);
  }

  return (
    <form action={sendInvoicesAction} className="flex flex-col gap-4">
      <input type="hidden" name="collectionId" value={collectionId} />
      {selectedIds.map((payerId) => (
        <input key={payerId} type="hidden" name="payerIds" value={payerId} />
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/35 p-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={toggleAll}
            disabled={selectableIds.length === 0}
          >
            {allSelectableSelected ? "Clear selection" : "Select all"}
          </Button>
          <p className="text-sm text-muted-foreground">
            {selectableIds.length} payer
            {selectableIds.length === 1 ? "" : "s"} awaiting invoice
          </p>
        </div>

        {selectedIds.length > 0 ? (
          <Button type="submit">
            <FileText aria-hidden="true" data-icon="inline-start" />
            Send invoice ({selectedIds.length})
          </Button>
        ) : null}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Select</TableHead>
            <TableHead>Payer</TableHead>
            <TableHead>External ID</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead className="text-right">Expected</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const isSent = Boolean(row.invoice);
            const checked = selectedIdSet.has(row.id);

            return (
              <TableRow
                key={row.id}
                data-state={checked ? "selected" : undefined}
              >
                <TableCell>
                  <Checkbox
                    aria-label={`Select ${row.fullName}`}
                    checked={checked}
                    disabled={isSent}
                    onCheckedChange={(value) =>
                      togglePayer(row.id, Boolean(value))
                    }
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/payers/${row.id}`} className="hover:underline">
                    {row.fullName}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.externalId || "None"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.email || row.phone || "Not provided"}
                </TableCell>
                <TableCell>
                  {row.invoice ? (
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/invoices/${row.invoice.id}`}
                        className="inline-flex items-center gap-1 font-medium hover:underline"
                      >
                        {row.invoice.invoiceNumber}
                        <Link2 aria-hidden="true" className="size-3.5" />
                      </Link>
                      <Badge variant="outline" className="w-fit">
                        {getStatusLabel(row.invoice.status)}
                      </Badge>
                    </div>
                  ) : (
                    <Badge variant="secondary">Not sent</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {row.amountLabel}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </form>
  );
}
