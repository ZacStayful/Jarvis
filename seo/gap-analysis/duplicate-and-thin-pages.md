# Duplicates, thin & stale pages

## City + service collisions

Same service line + city → more than one URL. Some are legitimate variants (`-cost`, `-vs-guaranteed-rent`) targeting distinct intent, others are accidental duplicates. Mark `action: consolidate` in the per-page stub if a single canonical page should replace the cluster.

| service | city | canonical-looking slug | variant slugs / type |
|---|---|---|---|
| airbnb_management | birmingham | `airbnb-management-birmingham` | `airbnb-management-birmingham-cost` *(cost-variant)* |
| airbnb_management | bristol | `airbnb-management-bristol` | `airbnb-management-bristol-vs-guaranteed-rent` *(comparison-variant)* |
| airbnb_management | cheshire | `airbnb-management-cheshire` | `airbnb-management-in-cheshire` *(prefix-variant (-in-))* |
| airbnb_management | chester | `airbnb-management-chester` | `airbnb-management-chester-cost` *(cost-variant)* |
| airbnb_management | hartlepool | `airbnb-management-hartlepool` | `airbnb-management-hartlepool-vs-guaranteed-rent` *(comparison-variant)* |
| airbnb_management | leeds | `airbnb-management-leeds` | `airbnb-management-leeds-vs-guaranteed-rent` *(comparison-variant)* |
| airbnb_management | lincoln | `airbnb-management-lincoln` | `airbnb-management-lincoln-vs-guaranteed-rent` *(comparison-variant)* |
| airbnb_management | liverpool | `airbnb-management-liverpool` | `airbnb-management-liverpool-cost` *(cost-variant)* |
| airbnb_management | manchester | `airbnb-management-manchester` | `airbnb-management-manchester-cost` *(cost-variant)* |
| airbnb_management | newcastle | `airbnb-management-newcastle` | `airbnb-management-newcastle-cost` *(cost-variant)* |
| airbnb_management | nottingham | `airbnb-management-nottingham` | `airbnb-management-nottingham-vs-guaranteed-rent` *(comparison-variant)* |
| airbnb_management | sheffield | `airbnb-management-sheffield` | `airbnb-management-sheffield-vs-self-managing` *(comparison-variant)* |
| airbnb_management | warwick | `airbnb-management-warwick` | `airbnb-management-warwick-vs-guaranteed-rent` *(comparison-variant)* |
| airbnb_management | windsor | `airbnb-management-windsor` | `airbnb-management-windsor-vs-guaranteed-rent` *(comparison-variant)* |
| airbnb_management | york | `airbnb-management-york` | `airbnb-management-york-vs-guaranteed-rent` *(comparison-variant)* |
| photography | manchester | `airbnb-photographer-manchester` | `airbnb-professional-photography-manchester` *(duplicate)* |
| serviced_accommodation_management | windsor | `serviced-accommodation-management-windsor` | `serviced-accommodation-management-windsor-vs-airbnb-management` *(comparison-variant)* |

## Slugs with numeric suffix (likely accidental duplicates)

- `airbnb-property-management-course-1` — https://www.stayful.co.uk/airbnb-property-management-course-1
- `airbnb-yield-leamington-spa-1` — https://www.stayful.co.uk/airbnb-yield-leamington-spa-1
- `holiday-let-management-peak-district-1` — https://www.stayful.co.uk/holiday-let-management-peak-district-1

## Pages with zero images (thin content candidates)

**Total:** 314 of 669 URLs.

Breakdown by category:

| category | zero-image pages |
|---|---|
| location-page | 167 |
| faq-questions | 49 |
| blog | 28 |
| topical-guides | 26 |
| service-hub | 16 |
| calculators-tools | 10 |
| regulations-rules | 7 |
| core | 4 |
| comparisons | 4 |
| investor-services | 2 |
| courses-academy | 1 |

Top 30 (alphabetical) — full list in `seo/index/classified.json`:

- `airbnb-agency` (service-hub)
- `airbnb-agency-bath` (location-page)
- `airbnb-calculators` (calculators-tools)
- `airbnb-cleaning-bicester` (location-page)
- `airbnb-cohost-birmingham` (location-page)
- `airbnb-cohost-coventry` (location-page)
- `airbnb-cohost-harrogate` (location-page)
- `airbnb-cohost-lake-district` (location-page)
- `airbnb-cohost-leamington-spa` (location-page)
- `airbnb-cohost-leeds` (location-page)
- `airbnb-cohost-liverpool` (location-page)
- `airbnb-cohost-manchester` (location-page)
- `airbnb-cohost-newcastle` (location-page)
- `airbnb-cohost-oxford` (location-page)
- `airbnb-earnings-bath` (location-page)
- `airbnb-guaranteed-rent` (service-hub)
- `airbnb-guest-management-sheffield` (location-page)
- `airbnb-host-fees-calculator` (calculators-tools)
- `airbnb-income-calculator` (calculators-tools)
- `airbnb-income-oxford` (location-page)
- `airbnb-investment-calculator` (calculators-tools)
- `airbnb-management-altrincham` (location-page)
- `airbnb-management-bath` (location-page)
- `airbnb-management-beeston` (location-page)
- `airbnb-management-bicester` (location-page)
- `airbnb-management-birmingham` (location-page)
- `airbnb-management-birmingham-cost` (location-page)
- `airbnb-management-blog-is-airbnb-profitable-uk` (blog)
- `airbnb-management-blog-serviced-accommodation-stayful` (blog)
- `airbnb-management-blog-serviced-accommodation-stayful-is-airbnb-profitable-in-leeds` (blog)

## Stale pages (last modified 2024)

**Total:** 31 pages.

- `airbnb-deal-selling` — lastmod 2024-06-22
- `short-let-management-darlington` — lastmod 2024-06-22
- `short-let-management-leeds` — lastmod 2024-06-22
- `short-let-management-newcastle` — lastmod 2024-06-22
- `short-let-management-stockton` — lastmod 2024-06-22
- `short-let-management-york` — lastmod 2024-06-22
- `airbnb-property-management-birmingham` — lastmod 2024-06-23
- `short-let-management-brighton` — lastmod 2024-07-04
- `short-let-management-chester` — lastmod 2024-07-04
- `short-let-management-doncaster` — lastmod 2024-07-04
- `airbnb-management-blog-serviced-accommodation-stayful/guide-to-serviced-accommodation-income-calculator` — lastmod 2024-08-11
- `meet-the-team` — lastmod 2024-08-11
- `airbnb-management-blog-serviced-accommodation-stayful/buy-to-let-vs-airbnb` — lastmod 2024-12-06
- `airbnb-management-blog-serviced-accommodation-stayful/occupancy-rates-for-airbnb` — lastmod 2024-12-06
- `airbnb-management-blog-serviced-accommodation-stayful/serviced-accommodation` — lastmod 2024-12-06
- `airbnb-management-blog-serviced-accommodation-stayful/the-guide-to-buy-to-let` — lastmod 2024-12-06
- `airbnb-management-blog-serviced-accommodation-stayful/3-airbnb-companies` — lastmod 2024-12-07
- `airbnb-management-blog-serviced-accommodation-stayful/airbnb-host-fees-everything-you-need-to-know` — lastmod 2024-12-07
- `airbnb-management-blog-serviced-accommodation-stayful/airbnb-management` — lastmod 2024-12-07
- `airbnb-management-blog-serviced-accommodation-stayful/best-airbnb-investment-locations-in-manchester` — lastmod 2024-12-07
- `airbnb-management-blog-serviced-accommodation-stayful/choosing-the-right-airbnb-management-company` — lastmod 2024-12-07
- `airbnb-management-blog-serviced-accommodation-stayful/essential-factors-to-keep-in-mind-when-installing-security-cameras-at-your-airbnb` — lastmod 2024-12-07
- `airbnb-management-blog-serviced-accommodation-stayful/guide-to-holiday-let-mortgages` — lastmod 2024-12-07
- `airbnb-management-blog-serviced-accommodation-stayful/guide-to-late-paying-tenants` — lastmod 2024-12-07
- `airbnb-management-blog-serviced-accommodation-stayful/how-to-handle-airbnb-reviews` — lastmod 2024-12-07
- `airbnb-management-blog-serviced-accommodation-stayful/how-to-optimise-your-airbnb-for-long-term-rentals` — lastmod 2024-12-07
- `airbnb-management-blog-serviced-accommodation-stayful/is-airbnb-profitable-in-leeds-` — lastmod 2024-12-07
- `airbnb-management-blog-serviced-accommodation-stayful/sa-vs-hmo` — lastmod 2024-12-07
- `airbnb-management-blog-serviced-accommodation-stayful/self-management-vs-hiring-an-airbnb-management-company` — lastmod 2024-12-07
- `airbnb-management-blog-serviced-accommodation-stayful/how-to-take-great-photos-for-your-airbnb-listing` — lastmod 2024-12-08
- `airbnb-management-blog-serviced-accommodation-stayful/k1rep8loowfa9pzr80qfs71779rfpb` — lastmod 2024-12-08

## Pages with no lastmod

- `airbnb-management-blog-serviced-accommodation-stayful/tag/Airbnb+rules`
- `airbnb-management-blog-serviced-accommodation-stayful/tag/serviced+accommodation`
