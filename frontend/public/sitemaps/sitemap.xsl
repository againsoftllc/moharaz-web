<?xml version="1.0" encoding="UTF-8"?>
<!-- Renders the XML sitemaps as a readable table in the browser; search engines ignore it. -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes" />
  <xsl:template match="/">
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>XML Sitemap — Moharaz</title>
        <style>
          body{font-family:Verdana,system-ui,sans-serif;font-size:13px;color:#222;margin:24px 16px}
          h1{font-size:18px;margin:0 0 4px}p{color:#666;margin:0 0 16px}
          table{border-collapse:separate;border-spacing:2px;max-width:100%}
          th{background:#f2f2f2;text-align:left;padding:10px 12px}th.c{text-align:center}
          td{padding:8px 12px;vertical-align:top}tr:nth-child(even) td{background:#f7f7f7}
          td.n{text-align:center;color:#555}td.c{text-align:center;white-space:nowrap}
          a{color:#000;word-break:break-all}a:hover{color:#E3121B}
        </style>
      </head>
      <body>
        <h1>XML Sitemap</h1>
        <xsl:choose>
          <xsl:when test="s:sitemapindex">
            <p><xsl:value-of select="count(s:sitemapindex/s:sitemap)" /> sitemaps</p>
            <table>
              <tr><th class="c">#</th><th>Sitemap</th><th class="c">Modified</th></tr>
              <xsl:for-each select="s:sitemapindex/s:sitemap">
                <tr>
                  <td class="n"><xsl:value-of select="position()" /></td>
                  <td><a href="{s:loc}"><xsl:value-of select="s:loc" /></a></td>
                  <td class="c"><xsl:value-of select="concat(substring(s:lastmod,1,10),' ',substring(s:lastmod,12,5))" /></td>
                </tr>
              </xsl:for-each>
            </table>
          </xsl:when>
          <xsl:otherwise>
            <p><a href="/sitemap.xml">← Sitemap index</a> · <xsl:value-of select="count(s:urlset/s:url)" /> URLs</p>
            <table>
              <tr><th class="c">#</th><th>URL</th><th class="c">Priority</th><th class="c">Change freq.</th><th class="c">Modified</th></tr>
              <xsl:for-each select="s:urlset/s:url">
                <tr>
                  <td class="n"><xsl:value-of select="position()" /></td>
                  <td><a href="{s:loc}"><xsl:value-of select="s:loc" /></a></td>
                  <td class="c"><xsl:value-of select="s:priority" /></td>
                  <td class="c"><xsl:value-of select="s:changefreq" /></td>
                  <td class="c"><xsl:value-of select="concat(substring(s:lastmod,1,10),' ',substring(s:lastmod,12,5))" /></td>
                </tr>
              </xsl:for-each>
            </table>
          </xsl:otherwise>
        </xsl:choose>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
