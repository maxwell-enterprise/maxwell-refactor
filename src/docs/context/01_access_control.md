# Business Architecture: Lock & Key Access Control
This application manages high-ticket leadership training events using a "Lock & Key" philosophy.

## Core Concepts
1. **The Lock (Event):** An event is not just a date on a calendar; it is a secured resource.
   - Events can be Hierarchical (Series -> Classes).
   - Events have "Access Rules".

2. **The Key (Access Tag):** Access is NOT granted by "buying a product". Access is granted by "possessing a Tag".
   - Products are merely vehicles to sell Tags.
   - Tags can be "UNLIMITED" (Badge style, e.g., VIP Pass) or "CONSUMABLE" (Punch card style, e.g., 5x Class Pass).

3. **The Wallet:** Users hold Tags in their Wallet.
   - When a user attends an event, the system checks their Wallet for a matching Tag defined in the Event's Access Rules.
   - If the Tag is CONSUMABLE, 1 credit is deducted.