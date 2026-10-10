# Connect prioritydesk.co.uk to GitHub Pages

Repository: https://github.com/ltaylor8891/prioritydesk-website

Default website: https://ltaylor8891.github.io/prioritydesk-website/

Privacy policy: https://ltaylor8891.github.io/prioritydesk-website/privacy.html

The website uses GitHub Pages. IONOS continues to manage the domain and DNS. No domain transfer or paid hosting package is needed for this setup. The app repository is separate.

## 1. Set the custom domain in GitHub first

Open https://github.com/ltaylor8891/prioritydesk-website/settings/pages.

Under **Custom domain**, enter `prioritydesk.co.uk` and click **Save**. Keep the publishing source set to **GitHub Actions**. A DNS check may initially fail until step 2 is complete.

Do this before changing DNS. The default GitHub Pages address will redirect to the custom domain after this setting is saved, so finish the DNS steps in the same session. Until you are ready to change DNS, leave the custom domain unset so the default website stays accessible.

GitHub recommends verifying domain ownership first: in your account **Settings → Pages → Add a domain**, enter `prioritydesk.co.uk`, copy GitHub's exact TXT record into IONOS DNS, then click **Verify**. Keep that TXT record after verification. GitHub supplies the unique TXT name and value; do not guess them.

## 2. Update IONOS DNS

Sign in to your IONOS account. Open **Domains & SSL**, find **prioritydesk.co.uk**, choose its three-dot **Actions** menu, then **DNS**. These changes apply when the domain uses IONOS nameservers.

Before editing, save a copy or screenshot of the existing DNS records. Change only the website records for `@` and `www`. Leave email records (MX, SPF, DKIM and DMARC), domain verification records, and unrelated subdomains alone.

Remove or replace the old website A/AAAA records at `@` and conflicting website records at `www`, then create these records. Each IP address is a separate A record; use the default TTL or one hour.

| Type | Host name | Points to / value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | ltaylor8891.github.io |

Enter only the hostname for the CNAME: no `https://`, repository name or slash. If a conflicting record is controlled by IONOS web hosting or domain forwarding, deactivate that website connection as prompted so these DNS entries can take effect; leave mail services active.

The domain's A record was `217.160.0.123` when checked on 11 October 2026. This is the old website destination and must not remain alongside the GitHub A records.

Optional IPv6: instead of leaving old AAAA records, either remove the old website AAAA entries or replace them with all four GitHub values below:

| Type | Host name | Value |
| --- | --- | --- |
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |

## 3. Enable HTTPS and check both addresses

Return to the repository's **Settings → Pages**. Once the DNS check passes and GitHub has issued the certificate, tick **Enforce HTTPS**. DNS propagation and certificate availability can take up to 24 hours.

Check these addresses:

- https://prioritydesk.co.uk/
- https://www.prioritydesk.co.uk/ (should redirect to the address without www)
- https://prioritydesk.co.uk/privacy.html

If the old page still appears, check the DNS records and try again after propagation. Do not bypass certificate warnings; wait for GitHub's certificate to become ready.

## Updating the site later

Edit the files in `dist`, commit them to `main`, and push. The **Publish website** GitHub Actions workflow automatically publishes the updated site. DNS only needs setting up once.

The privacy policy still contains placeholders for your business/name and contact email unless those details have subsequently been supplied. Fill those in before using the policy URL for an app-store submission.

## Official instructions

- [GitHub: managing a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [GitHub: verifying a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
- [IONOS: changing A/AAAA records](https://www.ionos.co.uk/help/domains/configuring-your-ip-address/changing-a-domains-ipv4ipv6-address-aaaaa-record/)
- [IONOS: configuring a CNAME record](https://www.ionos.com/help/domains/configuring-cname-records-for-subdomains/configuring-a-cname-record-for-a-subdomain/)
