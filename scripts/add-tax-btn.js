const fs = require("fs");
const path = "src/app/(dashboard)/sales/page.tsx";
let content = fs.readFileSync(path, "utf8");

const taxBtn = `</Button>
            <Button variant="outline" size="sm" onClick={async () => {
              const { exportTaxInvoiceExcel } = await loadExportExcel(); exportTaxInvoiceExcel(sales, storeSettings?.storeName || "ร้านแบตเตอรี่", "", "");
            }} className="h-7 text-[11px] border-green-200 hover:bg-green-50 text-green-700 gap-1 rounded-lg">
              <FileText className="h-3 w-3" /> ภาษี
            </Button>`;

// Desktop button: after "Excel"
content = content.replace(
  '<Download className="h-3 w-3" /> Excel',
  '<Download className="h-3 w-3" /> Excel' + taxBtn
);

// Mobile button: after "ส่งออก Excel"
content = content.replace(
  '<Download className="h-3 w-3" /> ส่งออก Excel',
  '<Download className="h-3 w-3" /> ส่งออก Excel' + taxBtn
);

fs.writeFileSync(path, content, "utf8");
console.log("✅ Added tax invoice buttons!");
