/**
 * permet d'executer un controller et de capturer l'erreur
 * @param {Function} controller 
 * @returns {Function} retourne le controller
 */
function asyncHandler(controller){
    return function(req,res,next){
        Promise.
        resolve(controller(req,res,next))
        .catch(next)
    }
}

module.exports = {asyncHandler}