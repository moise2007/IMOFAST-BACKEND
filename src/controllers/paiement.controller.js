const { asyncHandler } =
    require("../utils/asyncHandler");

const paiementService =
    require("../services/ApiService/paiement.service");

/**
 * Initialise un paiement.
 *
 * @route POST /createDepot
 */
const createDepot = asyncHandler(
    async (req, res) => {
        const result =
            await paiementService.createDepot({
                data:
                    req.validatedBody,

                user:
                    req.user,

                role:
                    req.role,
            });

        return res.status(200).json({
            success: true,

            msg: "Paiement initié",

            reference:
                result.reference,

            authorization_url:
                result.authorization_url,
        });
    }
);

/**
 * Vérifie le statut d'un paiement.
 *
 * @route POST /searchStatusPaiement
 */
const searchStatusPaiement =
    asyncHandler(
        async (req, res) => {
            const result =
                await paiementService
                    .searchStatusPaiement({
                        reference:
                            req.validatedBody
                                .reference,

                        user:
                            req.user,

                        role:
                            req.role,
                    });

            return res.status(200).json({
                success: true,

                data: {
                    montant:
                        result.montant,

                    status:
                        result.status,
                },

                reference:
                    result.reference,

                authorization_url:
                    result.authorization_url,

                forfait:
                    result.forfait,

                msg:
                    result.message,
            });
        }
    );

module.exports = {
    createDepot,
    searchStatusPaiement,
};