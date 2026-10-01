# Deploy to a custom domain

Set `domain` in `console.config.ts` before deploying. SST serves Console through
CloudFront and provisions site resources in configured deployment account.

Do not configure one hostname in more than one SST stage. Each hostname must have one
owner; use distinct hostnames such as `console.example.com` and
`console-dev.example.com` for separate stages.

## Route 53 in deployment account

This is smallest configuration. Configured AWS profile must have permission to read public
Route 53 hosted zone and create DNS records.

Before deploying, ensure a public hosted zone for parent domain exists in deployment
account. For `console.example.com`, use hosted zone for `example.com` unless you have
delegated `console.example.com` as its own zone.

1. Sign in to AWS Console using deployment account.
2. Open **Route 53**, then choose **Hosted zones** in left navigation.
3. If parent zone does not exist, choose **Create hosted zone**. Enter parent domain, such
   as `example.com`, select **Public hosted zone**, then choose **Create hosted zone**.
4. If DNS registrar does not already use Route 53 nameservers, open newly created zone,
   copy four values from its NS record, and replace nameservers at registrar. Wait for
   delegation before deploying.

If `example.com` already has a public Route 53 hosted zone in deployment account and its
nameservers are authoritative, no DNS records need to be created manually. SST creates ACM
validation records and CloudFront alias record during deployment.

```ts
domain: {
	name: "console.example.com";
}
```

SST finds matching hosted zone, creates and validates ACM certificate in `us-east-1`, and
creates CloudFront alias record.

If deployment account has multiple matching hosted zones, select one explicitly:

```ts
domain: {
	name: "console.example.com",
	dns: {
		provider: "route53",
		zoneId: "Z2FDTNDATAQYW2"
	}
}
```

Find hosted zone ID by opening zone in **Route 53** → **Hosted zones**. Copy **Hosted zone
ID** from zone details, omitting `/hostedzone/` if AWS Console includes it.

## Route 53 in separate account

Use delegated subdomain. This keeps all DNS mutations and Console resources in deployment
account; this project does not configure cross-account Route 53 access.

1. Sign in to deployment account. Open **Route 53** → **Hosted zones** → **Create hosted
   zone**. Enter delegated subdomain, such as `console.example.com`, select **Public
   hosted zone**, then choose **Create hosted zone**.
2. Open new hosted zone. Copy four nameserver values from automatically created NS record.
   Also copy **Hosted zone ID** from zone details.
3. Sign in to account that owns parent zone. Open **Route 53** → **Hosted zones**, then
   select parent zone, such as `example.com`.
4. Choose **Create record**. Enter `console` as record name, choose type **NS**, and enter
   four nameservers copied from deployment-account zone. Choose **Create records**. Do not
   remove NS record in delegated zone.
5. Configure Console with deployment-account hosted zone ID:

```ts
domain: {
	name: "app.console.example.com",
	dns: {
		provider: "route53",
		zoneId: "Z2FDTNDATAQYW2"
	}
}
```

6. Wait for NS delegation to resolve, then deploy. In Route 53, choose **Registered
   domains** → domain → **Test record** to look up NS records, or run
   `dig NS console.example.com`.

Deployment profile needs Route 53 permissions only in deployment account. Directly
managing records in hosted zone owned by another account requires separately configured
AWS cross-account credentials and is not supported by this configuration.

## External DNS provider

Create ACM certificate in `us-east-1`; CloudFront cannot use certificate from any other
AWS region.

1. Sign in to deployment account. In AWS Console region selector, choose **US East (N.
   Virginia) `us-east-1`**.
2. Open **Certificate Manager** → **Certificates** → **Request**. Select **Request a public
   certificate** and choose **Next**.
3. Enter hostname, such as `console.example.com`, select **DNS validation**, then choose
   **Request**.
4. Open new certificate. Under **Domains**, copy CNAME name and value shown for validation.
5. In DNS provider's record-management page, create copied CNAME record. Do not alter the
   generated name or value. Return to ACM and wait until certificate status is `Issued`.

Then configure its ARN. SST does not change external DNS records in this mode.

```ts
domain: {
	name: "console.example.com",
	dns: {
		provider: "external",
		certificateArn:
			"arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012"
	}
}
```

Deploy, then find distribution domain name in AWS Console: open **CloudFront** →
**Distributions**, select Console distribution, and copy **Distribution domain name** (for
example, `d123456abcdef8.cloudfront.net`).

In DNS provider's record-management page, point configured hostname to distribution domain
name. Use CNAME for subdomains. For apex domains, use provider's ALIAS, ANAME, or
CNAME-flattening record if available. Do not create a DNS record until certificate is
`Issued` and deployment has created distribution.

SST can automate DNS for Route 53, Cloudflare, and Vercel when matching SST providers are
configured. Console configuration currently supports Route 53 automation and generic
manual DNS only.

## After deployment

Certificate validation, DNS propagation, and CloudFront distribution updates are
asynchronous. A deploy can finish before global DNS propagation or CloudFront edge rollout
finishes. Check ACM certificate status, DNS answers, and CloudFront distribution status
before treating new hostname as unavailable.
