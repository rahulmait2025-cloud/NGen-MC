import * as React from "react"
import { cn } from "@/lib/utils"

function Table({ className, ref, ...props }: React.HTMLAttributes<HTMLTableElement> & React.RefAttributes<HTMLTableElement>) {
    return (
        <div className="relative w-full overflow-auto">
            <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
        </div>
    )
}
Table.displayName = "Table"

function TableHeader({ className, ref, ...props }: React.HTMLAttributes<HTMLTableSectionElement> & React.RefAttributes<HTMLTableSectionElement>) {
    return <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
}
TableHeader.displayName = "TableHeader"

function TableBody({ className, ref, ...props }: React.HTMLAttributes<HTMLTableSectionElement> & React.RefAttributes<HTMLTableSectionElement>) {
    return <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
}
TableBody.displayName = "TableBody"

function TableFooter({ className, ref, ...props }: React.HTMLAttributes<HTMLTableSectionElement> & React.RefAttributes<HTMLTableSectionElement>) {
    return <tfoot ref={ref} className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
}
TableFooter.displayName = "TableFooter"

function TableRow({ className, ref, ...props }: React.HTMLAttributes<HTMLTableRowElement> & React.RefAttributes<HTMLTableRowElement>) {
    return <tr ref={ref} className={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)} {...props} />
}
TableRow.displayName = "TableRow"

function TableHead({ className, ref, ...props }: React.ThHTMLAttributes<HTMLTableCellElement> & React.RefAttributes<HTMLTableCellElement>) {
    return <th ref={ref} className={cn("h-10 px-4 text-left align-middle text-xs font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className)} {...props} />
}
TableHead.displayName = "TableHead"

function TableCell({ className, ref, ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & React.RefAttributes<HTMLTableCellElement>) {
    return <td ref={ref} className={cn("px-4 py-3 align-middle text-sm [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className)} {...props} />
}
TableCell.displayName = "TableCell"

function TableCaption({ className, ref, ...props }: React.HTMLAttributes<HTMLTableCaptionElement> & React.RefAttributes<HTMLTableCaptionElement>) {
    return <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
}
TableCaption.displayName = "TableCaption"

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell }
