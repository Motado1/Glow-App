# Setting up Supabase for the Glow Field Operations app

**Who this is for:** Jared. You don't need to write any code or install anything.
**How long:** about 20 minutes.
**Cost:** free. You will not be asked for a card.

---

## What you're actually doing, in plain terms

Right now the app keeps everything on the one device it was typed into. Farms you
enter on your laptop don't reach Dan's phone, and photos Dan takes don't reach you.
There's nothing in the middle.

Supabase is the thing in the middle. It's a hosted database — a filing cabinet on the
internet that all your devices talk to. Once it's connected:

- You enter a farm once and the whole crew sees it.
- Photos upload from the field instead of sitting on a phone.
- Everyone gets a real login with a real password.
- **You can lock fields so photographers and installers never see them** — customer
  contact details, contracts, anything you decide is yours only. That's the part that
  can't be done today, because right now everything lives on the device and anything
  on the device can be read.
- Nothing is lost if a phone breaks or a browser gets cleared.

You're just creating the account and handing me two values. I do the rest.

---

## Step 1 — Create your account

1. Go to **[supabase.com](https://supabase.com)**.
2. Click **Start your project** (top right).
3. Sign up with **GitHub** or with an email and password — either is fine. If you use
   email, use a Glow address you'll keep access to, not a personal one.
4. Confirm the email if it asks you to.

> **Use an address that outlives any one person.** This account will eventually own
> Glow's field data. If it's tied to a personal Gmail, whoever owns that Gmail owns
> the data. `jared@glow.org` is the right kind of choice.

---

## Step 2 — Create the organization

First time in, it asks you to make an organization.

1. **Name:** `Glow`
2. **Type:** Company
3. **Plan:** **Free**

The free plan is genuinely enough to start: 500 MB of database and 1 GB of file
storage. To put that in perspective, the database holds text — farms, statuses,
assignments — and you'd need tens of thousands of farms to fill 500 MB.

The 1 GB of photo storage is the part that will run out first. At roughly 1–2 MB per
photo after the app compresses it, that's somewhere around 500–1,000 photos. Fine for
a pilot; not enough for a season. When you get close, the next tier is $25/month and
lifts storage to 100 GB. **Don't pay for it yet** — start free, and we'll watch the
number.

---

## Step 3 — Create the project

1. Click **New project**.
2. **Name:** `glow-field-ops`
3. **Database Password:** click **Generate a password**, then **copy it and save it
   somewhere you won't lose** — a password manager, or written down somewhere safe.

   > You will almost certainly never need this password. But it cannot be recovered —
   > only reset, which takes the database offline for a minute. Save it once now.

4. **Region:** pick the one closest to where the crew actually works.
   - Crew in Colorado / Kansas → **West US (North California)** or **East US (Ohio)**.
     Either is fine; Ohio is marginally closer to Kansas.
   - This only affects speed, by fractions of a second. Don't overthink it.
   - **It cannot be changed later without rebuilding the project**, which is the only
     reason it's worth a moment's thought at all.

5. Click **Create new project**.

It takes about two minutes to build. You'll see a progress spinner. Leave the tab open.

---

## Step 4 — Get the two values I need

Once the project finishes building:

1. In the left sidebar, click the **gear icon** (**Project Settings**), at the bottom.
2. Click **API** (or **API Keys** — Supabase moves this occasionally; it's in the same
   settings area either way).

You're looking for two things:

| What | Looks like | Send to me? |
|---|---|---|
| **Project URL** | `https://abcdefghijkl.supabase.co` | ✅ Yes |
| **anon** / **public** key | a very long string starting `eyJ...` | ✅ Yes |
| **service_role** / **secret** key | also starts `eyJ...` | ❌ **Never** |

Copy the **Project URL** and the **anon public** key and send them to me.

### About that third key — this is the one thing that matters

On the same screen you'll see a key labelled **service_role**, usually with a warning
and a "reveal" button hiding it.

**Never send that one. Not to me, not to anyone, not in a screenshot.**

Here's the difference, without jargon:

- The **anon key** is designed to be public. It ships inside the app on every phone.
  On its own it can't do anything — it only lets someone knock on the door, and the
  rules I'll set up decide what they're allowed to see once they're in. A photographer
  holding this key still can't read your customer contacts.
- The **service_role key** skips every rule. Anyone holding it can read, change, or
  delete everything in the database, from anywhere, no login required. It exists for
  servers, not people.

If you ever paste it somewhere by accident — a chat, an email, a screenshot — go to
that same API settings page and click the reset/rotate button on it. That instantly
makes the old one useless. No harm done as long as you rotate it.

> **Rule of thumb:** if a key has a warning label and is hidden behind a "reveal"
> button, it's not meant to leave that page.

---

## Step 5 — Send them over

Send me:

```
Project URL:  https://xxxxxxxxxx.supabase.co
anon key:     eyJhbGciOi... (the long one marked "anon" or "public")
```

That's your whole job. I'll build the database tables, set up the permission rules,
migrate the app, and give you a login.

---

## What happens next, and what it won't fix

**Once it's connected:**
- Real logins with real passwords for you and everyone on the crew.
- Farms, assignments and statuses sync across every device within seconds.
- Photos upload from the field and are backed up off the phone.
- Permission rules enforced **on the server**, so a photographer's app can't request
  data they're not allowed to have — even if someone tried to tamper with the app.
- If a phone is lost, nothing is lost with it.

**What it still won't do, so there are no surprises:**
- It doesn't connect to the Glow Hub. PTO is still a button you press.
- It doesn't make photos upload without signal — they'll still queue on the phone and
  send when the crew gets back in range. That's already how it works and it's correct.
- It won't retroactively rescue anything you enter into the app *before* this is
  connected. **So don't type your real farm list in twice** — either wait for the
  backend, or accept that the first pass is practice.

---

## If something goes wrong

| Problem | What to do |
|---|---|
| Stuck "Setting up project" for more than 5 minutes | Refresh the page. It's usually done and the page didn't update. |
| Can't find the API settings page | Supabase reorganizes this occasionally. Look for **Project Settings → API** or **API Keys**. Send me a screenshot of the sidebar if you can't find it — just don't include any revealed key in the shot. |
| Lost the database password | Project Settings → Database → Reset database password. Brief downtime, no data lost. |
| Accidentally shared the service_role key | Project Settings → API → rotate/reset that key. Immediate fix. |
| Asked for a credit card | Stop — you're on a paid plan by mistake. Go back and pick **Free**. |

Anything else, send me a screenshot and I'll sort it.
