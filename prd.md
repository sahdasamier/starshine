# Product Requirements Document

**Product:** Umrah Management System
**Agency:** Star Shine Tours Aswan
**Document version:** 2.2
**Date:** 7 November 2026
**Platform:** Internal web application, desktop and tablet

## 1. Purpose

The Umrah Management System is the internal tool Star Shine Tours Aswan uses to move a customer booking from reception to completion. Staff record the booking, the money, and whether each pilgrim's passport, visa, and ticket are done. The app is for employees only.

A booking is one trip. It can contain one or more pilgrims. The stage and the money belong to the booking. Each pilgrim has their own name and their own passport, visa, and ticket flags. A solo traveler is a booking with one pilgrim.

## 2. Brand, language, and money

The login page and the header show the full logo in `assets/logo.jpg`: the blue mark, the ribbon reading `WWW.STARSHINETOURSASWAN.COM`, and the gold wordmark **STAR SHINE TOURS ASWAN**. The interface uses that blue and gold on a light background.

The staff UI ships in Arabic and English.

- Arabic is the default. Arabic layout is right-to-left. English layout is left-to-right.
- Every new account starts in Arabic. The employee can switch language on the login page and inside the app. The signed-in choice is saved on the account.
- Labels, buttons, stages, roles, program types, payment plans, and validation messages exist in both languages.
- Contact names, pilgrim names, and return reasons stay as typed.
- File numbers, money, phones, and dates use Western digits. Dates display as day-month-year.
- Return notes show their time in Egypt time.

All amounts are Egyptian pounds (EGP), with up to two decimal places. Arabic shows `ج.م`. English shows `EGP`. The screen shows the paid percentage as a whole number. Approval compares the exact ratio of amount paid to total. Amounts are stored to the piaster so that comparison is exact.

## 3. Accounts and access

Employees sign in with email and password. Passwords are at least 8 characters. The developer creates the first admin during setup. After that, admins create every account. There is no self-registration. The admin sets the password and replaces it when someone forgets it.

Each employee has one login and one role:

| Role | Lands on | What they can change |
| --- | --- | --- |
| Admin | Employee list | Accounts only. An admin does not move bookings. |
| Reception | Reception queue | Contact, departure date, program type, pilgrim list, and passport flags, only while the booking is in Reception |
| Accountant | Accounting queue | Total and payment plan, only while the booking is in Accounting. Amount paid, any time after the booking has reached Accounting |
| Auditor | Audit queue | Edit every field on any file, on a phone or a wide screen. Create a new file. Approve or return |
| Operations | Execution queue | Visa and ticket flags, only while the booking is in Execution |

An admin who also works a stage uses a second login. Every signed-in employee can open every booking and read its status and details. Actions depend on the role and the booking's current stage, including when the booking was opened from search.

Each employee has a display name, shown on return notes and in the employee list. The admin can change the name, email, password, and role, can disable the account, and can remove the account. A disabled employee cannot sign in. Removing an employee deletes the login and the directory row. Past notes keep the name and role they stored at the time. An admin cannot disable or remove their own account, and cannot remove their own admin role.

## 4. The booking

A booking is created with a file number. Numbers start at 1, increase by one, and are never reused. Staff use this number to refer to the file.

Fields on the booking:

| Field | Required to submit | Notes |
| --- | --- | --- |
| Contact name | Yes | The contact does not have to be a pilgrim |
| Phone | Yes | Egyptian mobile. See below |
| Departure date | Yes | A calendar date, with no time |
| Program type | Yes | One of Double, Triple, Quad, Quint. One label for the whole booking. It does not set the price |
| Trip level | Yes | Standard (Middle), Premium (Above Middle), or VIP / Luxury (Advanced) |
| Hotel name | No | Optional. The auditor types it while the file is in Audit. The admin can change it on any file |
| Payment plan | Yes | Cash or Installments |
| Pilgrims | At least one | Each pilgrim has a full name |

Phone input accepts `01` followed by 9 digits, or the same number written with `+20`. The stored value is `+20` plus the 10 digits that follow the leading zero. Example: `01012345678` is stored as `+201012345678`.

Each pilgrim stores:

- Full name
- Passport received (starts unchecked)
- Visa issued (starts unchecked)
- Ticket issued (starts unchecked)

The booking does not store passport number, nationality, date of birth, or gender. It does not store an installment schedule or a list of individual payments.

Money on the booking:

- **Total** starts empty. The admin stores a default price in Egyptian pounds for each trip level. When the file is in Accounting and the total is still empty, that default fills the total for the chosen level. The accountant, the auditor, and the admin can type a different total for this file. Reception cannot change the total. The total must be greater than zero before the booking can leave Accounting.
- **Amount paid** starts at 0. Until a total exists, it stays 0. After that, the accountant can set it anywhere from 0 through the total.
- **Remaining** is the total minus the amount paid. The screen calculates it.
- A later edit of the amount paid overwrites the current number.
- The total cannot be set below the current amount paid. The accountant lowers the amount paid first.

The same phone or pilgrim name may appear on more than one booking. The system allows that with no warning.

The admin can remove one pilgrim from a booking, from the open file or from a trip list. Removing the last pilgrim removes the whole file. The admin can also remove a whole file from any list. A removed file number is never reused. Other staff correct a booking by editing or by returning it. A trip is not a separate record. It is every booking that shares one departure date. The number of people on that trip is the number of pilgrims across those bookings, including bookings that are already completed.

## 5. Pipeline

The booking sits in one stage. Forward and back both move exactly one stage.

| From | Forward | Back |
| --- | --- | --- |
| Reception | Accounting, one click | None |
| Accounting | Audit, one click | Reception, with a reason |
| Audit | Execution, one click | Accounting, with a reason |
| Execution | Completed, after confirmation | Audit, with a reason |
| Completed | None | None |

Reception creates a booking by submitting it. The booking enters Accounting immediately. Nothing sits half-finished in Reception unless it was returned there. Submit and resubmit both require a contact name, phone, departure date, program type, payment plan, and at least one pilgrim name. The passport flag may be unchecked. The last pilgrim cannot be removed.

Reception can change the contact, the departure date, the program type, the pilgrim list, and the passport flags only while the booking is in Reception. The auditor can change every field on any file, including a completed file, from a phone, a tablet, or a wide screen, and can also create a new file. A completed file still cannot move backward. A passport that arrives later can be recorded by the auditor on the open file, or by returning the booking to Reception.

The accountant chooses when to send the booking to Audit. The total must be greater than zero. The amount paid may still be zero. Reception's payment plan can be changed by the accountant only during Accounting. After the booking leaves Accounting, the total and the payment plan stay fixed unless the booking is returned there.

The auditor approves in one click, or returns the booking with a reason. Approval requires both of the following:

- Every pilgrim's passport-received flag is checked.
- The payment rule passes. Cash and installments both require the amount paid to be at least half the total.

Below that rule, Approve stays disabled. Return stays available.

Operations check visa and ticket on each pilgrim, in either order, and can uncheck them while the booking is in Execution. Those boxes and **Complete** stay locked until the amount paid is at least half the total. **Complete** asks for confirmation. It becomes available only when that half is paid and every pilgrim has both flags checked. Completed means the customer has received the visa and the tickets. Completion freezes the contact, the departure date, the program type, the pilgrim list, and those flags. The booking does not disappear. It stays in the completed list, in All files (the history), and on its departure date in Trips. Every employee can read it. It cannot return to Execution.

The accountant can still change the amount paid on a booking in Audit, Execution, or Completed. That edit leaves the stage where it is. The auditor can change the contact, the pilgrims, the hotel, the trip level, the total, the amount paid, and the payment plan on any file. Visa and ticket stay locked until at least half is paid, including for the auditor. A file below half paid cannot be approved.

A return stores a note and changes the stage. Amounts, pilgrims, and flags stay as they were. The note records the employee's display name, the role they held at that moment, the time in Egypt, the stage it left, the stage it entered, and the reason. The reason is required. Notes stay on the booking, in order, and every role can read them. This list is the only history. The booking does not keep a separate record of who approved it, who completed it, or earlier amounts paid.

## 6. Marks

- A booking in Audit, Execution, or Completed that is below its payment rule shows an underpaid mark on the queue and on the booking. It stays in its stage.
- A booking in Accounting or Audit with any passport flag unchecked shows a missing-passport mark on the queue and on the booking.

Accounting does not show an underpaid mark. A zero payment is expected there.

## 7. Queues and search

Each operational role opens on a shared queue of the bookings currently in their stage. Anyone with that role can act on any of them. There is no assign-to-me step.

Queues sort by departure date, soonest first. Bookings with the same date sort by file number.

Search finds any booking. A file number matches exactly. A contact name, pilgrim name, or phone matches when the typed text appears anywhere in that field. Latin letter case is ignored. Phone search matches either the `01…` form or the stored `+20…` form.

The completed list shows bookings whose visa and tickets are done. **History** (All files) shows every booking, including completed ones, so an old trip can be opened by its departure date. It sorts with the latest departure date first. **Trips** groups the same bookings by departure date. Upcoming includes today and later dates, soonest first. Past is every earlier date, latest first. Choosing a date shows that day’s passenger list: each pilgrim’s name, file number, contact, phone, program, and stage, plus the pilgrim count and the file count. Today follows Egypt time.

On the new-file form, and when a file is edited, choosing a departure date shows the other pilgrims already booked on that date and how many people that is. The file being edited is not counted in its own list. An empty date says that nobody is booked yet.

## 8. Technology

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Forms and validation: React Hook Form and Zod
- Auth, database, and hosting: Firebase Authentication, Cloud Firestore, and Firebase Hosting
- The app runs in one Firebase project the agency owns, on pay-as-you-go billing
- Signed-in access and the role rules above are enforced in Firebase Security Rules

## 9. Out of scope for this version

- Scanning or uploading passports, visas, or tickets
- SMS or WhatsApp messages
- Revenue, package, or debt reports
- A customer login
- Offline use
- Installment due dates or a payment ledger
- A price list driven by program type
- Saved drafts
