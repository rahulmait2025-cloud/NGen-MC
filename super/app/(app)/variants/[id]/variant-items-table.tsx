'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2, Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { removeVariantItemAction } from '../actions';

interface VariantItemsTableProps {
  variantId: string;
  items: Array<{
    id: string;
    master_course_item_id: string;
    sort_order: number;
    inclusion_type: string;
    master_course_items: {
      title: string;
      item_type: string;
      publish_status: string;
    };
  }>;
}

export function VariantItemsTable({ variantId, items }: VariantItemsTableProps) {
  const { refresh } = useRouter();
  const [, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (itemId: string, itemTitle: string) => {
    if (!window.confirm(`Remove "${itemTitle}" from this variant?`)) return;

    setDeletingId(itemId);
    startTransition(async () => {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        await removeVariantItemAction(variantId, item.master_course_item_id);
      }
      refresh();
    });
  };

  const sortedItems = items.toSorted((a, b) => a.sort_order - b.sort_order);

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="size-5" />
            Variant Items
          </CardTitle>
          <CardDescription>
            These are the Master Course items included in this variant.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Package className="size-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No items added yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Add items from the parent Master Course to this variant.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="size-5" />
          Variant Items
        </CardTitle>
        <CardDescription>
          These are the Master Course items included in this variant.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="flex items-center gap-3 px-2 py-1.5 text-xs font-medium text-muted-foreground border-b">
            <span className="flex-1">Item</span>
            <span className="w-16">Type</span>
            <span className="w-20">Inclusion</span>
            <span className="w-20">Status</span>
            <span className="w-12">Action</span>
          </div>
          {sortedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-2 py-1.5 rounded text-sm hover:bg-muted/30"
            >
              <span className="flex-1 truncate font-medium">
                {item.master_course_items.title}
              </span>
              <span className="w-16 text-xs text-muted-foreground">
                {item.master_course_items.item_type}
              </span>
              <span className="w-20 text-xs text-muted-foreground">
                {item.inclusion_type}
              </span>
              <span className="w-20">
                {item.master_course_items.publish_status === 'published' ? (
                  <Badge className="bg-emerald-500/10 text-emerald-700 text-xs">Published</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Draft</Badge>
                )}
              </span>
              <span className="w-12">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleDelete(item.id, item.master_course_items.title)
                  }
                  disabled={deletingId === item.id}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                >
                  {deletingId === item.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="size-3.5" />
                  )}
                </Button>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}