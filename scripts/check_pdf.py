import pypdf

r = pypdf.PdfReader('/mnt/d/projects/mc-fleet-bot/docs/masterplans/03-houston-tunnel-system/masterplan.pdf')
print(f'Pages: {len(r.pages)}')

total_links = 0
toc_link_pages = set()
for i, page in enumerate(r.pages):
    if '/Annots' in page:
        annots = page['/Annots']
        for annot in annots:
            obj = annot.get_object() if hasattr(annot, 'get_object') else annot
            if obj.get('/Subtype') == '/Link':
                total_links += 1
                toc_link_pages.add(i)

print(f'Total link annotations: {total_links}')
print(f'Pages with link annotations: {len(toc_link_pages)}')
