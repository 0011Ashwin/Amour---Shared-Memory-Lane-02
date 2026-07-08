# Security Specification for Amour - Shared Memory Lane

## Data Invariants
1. A memory must have a title, date, and type.
2. A memory must have a valid `userId` matching the creator.
3. Access is restricted to the two specific partners (Ashwin and Khushi).

## The Dirty Dozen Payloads
1. Attempting to create a user profile for someone other than the authenticated user.
2. Attempting to read someone else's memory (if there were other users, but here it's restricted).
3. Attempting to create a memory with a future timestamp (unless it's an event).
4. Attempting to delete a memory you didn't create (though both partners should have delete rights).
5. Attempting to inject a 1MB string into the title.
6. Attempting to change the `userId` of an existing memory.
7. Attempting to set `role: "admin"` in user profile.
8. Unauthenticated read attempt.
9. Unauthenticated write attempt.
10. Attempting to update `createdAt` field.
11. Injecting script tags in the description.
12. Attempting to list all users.

## Access Policy
- Two users are allow-listed based on email (or just a shared partnership flag if verified).
- Since I know the names, I should ideally allow-list the user's specific email: `ashwinmehta1234500@gmail.com`. I'll also need Khushi's email, but since I don't have it yet, I'll allow "partner" access if they are in the `users` collection.
- Actually, a better way is to check if the user's UID exists in the `users` collection and has `role == 'partner'`.

I will generate the rules in the next step.
