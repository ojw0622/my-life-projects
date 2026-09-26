import { PencilIcon, PlusIcon } from "lucide-react";

import { DeleteButton } from "@/components/delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { deleteAsset } from "../actions";
import { CATEGORY_LABELS } from "../lib/constants";
import { formatMoney, formatPercent, formatQuantity, formatSignedMoney, formatUpdatedAt } from "../lib/format";
import type { PortfolioView } from "../lib/portfolio";
import { AssetFormDialog } from "./asset-form-dialog";
import { ChangeText } from "./change-text";
import { DriftBadge } from "./drift-badge";

export function AssetTable({ view }: { view: PortfolioView }) {
  if (view.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-12 text-center">
        <p className="text-muted-foreground text-sm">아직 등록된 자산이 없습니다.</p>
        <AssetFormDialog
          trigger={
            <Button>
              <PlusIcon /> 첫 자산 등록
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>자산</TableHead>
          <TableHead className="text-right">수량</TableHead>
          <TableHead className="text-right">현재가</TableHead>
          <TableHead className="text-right">평가액 (KRW)</TableHead>
          <TableHead className="text-right">평가손익</TableHead>
          <TableHead className="text-right">현재 비중</TableHead>
          <TableHead className="text-right">목표 비중</TableHead>
          <TableHead className="text-right">괴리</TableHead>
          <TableHead className="w-20">
            <span className="sr-only">작업</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {view.items.map((item) => {
          const { row } = item;
          return (
            <TableRow key={row.id} className={cn(item.outOfBand && "bg-critical/5")}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{row.asset_name}</span>
                  {row.ticker ? <span className="text-muted-foreground text-xs">{row.ticker}</span> : null}
                  <Badge variant="outline">{CATEGORY_LABELS[row.category]}</Badge>
                  {!row.auto_price && row.category !== "cash" ? (
                    <Badge variant="secondary" title="현재가를 직접 입력하는 자산">
                      수동
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatQuantity(Number(row.current_qty))}</TableCell>
              <TableCell className="text-right">
                <div
                  className="tabular-nums"
                  title={row.price_updated_at ? `${formatUpdatedAt(row.price_updated_at)} 갱신` : undefined}
                >
                  {formatMoney(Number(row.current_price), row.currency)}
                </div>
                {item.dayChange !== null ? <ChangeText rate={item.dayChange} className="text-xs" /> : null}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(item.valueKrw)}</TableCell>
              <TableCell className="text-right">
                {item.returnRate === null || item.pnlKrw === null ? (
                  <span className="text-muted-foreground">–</span>
                ) : (
                  <>
                    <div className="tabular-nums">{formatSignedMoney(item.pnlKrw)}</div>
                    <ChangeText rate={item.returnRate} className="text-xs" />
                  </>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatPercent(item.currentWeight)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatPercent(item.targetWeight)}</TableCell>
              <TableCell className="text-right">
                <DriftBadge drift={item.drift} band={Number(row.tolerance_band)} outOfBand={item.outOfBand} />
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <AssetFormDialog
                    asset={row}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`${row.asset_name} 수정`} title="수정">
                        <PencilIcon className="size-4" />
                      </Button>
                    }
                  />
                  <DeleteButton action={deleteAsset.bind(null, row.id)} label={`${row.asset_name} 삭제`} />
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell colSpan={3}>합계</TableCell>
          <TableCell className="text-right tabular-nums">{formatMoney(view.totalValueKrw)}</TableCell>
          <TableCell className="text-right">
            {view.totalPnlRate === null ? null : (
              <>
                <div className="tabular-nums">{formatSignedMoney(view.totalPnlKrw)}</div>
                <ChangeText rate={view.totalPnlRate} className="text-xs" />
              </>
            )}
          </TableCell>
          <TableCell className="text-right tabular-nums">{view.totalValueKrw > 0 ? "100.0%" : "–"}</TableCell>
          <TableCell className={cn("text-right tabular-nums", !view.targetsValid && "text-destructive")}>
            {formatPercent(view.targetSum, 2)}
          </TableCell>
          <TableCell colSpan={2} />
        </TableRow>
      </TableFooter>
    </Table>
  );
}
