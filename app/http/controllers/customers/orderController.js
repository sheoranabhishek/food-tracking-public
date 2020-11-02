const Order = require('../../../models/order')
const moment = require('moment')
const stripe = require('stripe')('YOUR STRIPE SECRET KEY HERE')
const nodemailer = require('nodemailer')
const sendgridTransport = require('nodemailer-sendgrid-transport')

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: '//SENDGRID API HERE'
    }
}));
function orderController () {
    return {
        store(req, res) {
            // Validate request
            const { phone, address, stripeToken, paymentType } = req.body
            if(!phone || !address) {
                return res.status(422).json({ message : 'All fields are required' });
            }

            const order = new Order({
                customerId: req.user._id,
                items: req.session.cart.items,
                phone,
                address
            })
            order.save().then(result => {
                Order.populate(result, { path: 'customerId' }, (err, placedOrder) => {
                    // req.flash('success', 'Order placed successfully')

                    // Stripe payment
                    if(paymentType === 'Pay With Card') {
                        stripe.charges.create({
                            amount: req.session.cart.totalPrice  * 100,
                            source: stripeToken,
                            currency: 'inr',
                            description: `Pizza order: ${placedOrder._id} | Email : ${placedOrder.customerId.email} `
                        }).then(() => {
                            placedOrder.paymentStatus = true
                            placedOrder.paymentType = paymentType
                            placedOrder.save().then((ord) => {
                                // Emit
                                const eventEmitter = req.app.get('eventEmitter')
                                eventEmitter.emit('orderPlaced', ord)
                                delete req.session.cart
                                transporter.sendMail({
                                    to:placedOrder.customerId.email,
                                    from: '//YOUR VERIFIED EMAIL ID HERE ',
                                    subject: 'Order Placed Successfully' ,
                                    html: `<h1>You have successfully placed your order . Payment Completed</h1> <br> <h3> Your food will arrive soon. </h3>`
                                }).catch((err)=> {
                                    console.log(err);
                                })
                                return res.json({ message : 'Payment successful, Order placed successfully' });

                            }).catch((err) => {
                                console.log(err)
                            })

                        }).catch((err) => {
                            transporter.sendMail({
                                to:placedOrder.customerId.email,
                                from: '//YOUR VERIFIED EMAIL ID HERE',
                                subject: 'Order Placed Successfully' ,
                                html: `<h1>You have successfully placed your order . Payment Failed , Pay on Delivery </h1> <br> <h3> Your food will arrive soon. </h3>`
                            }).catch((err)=> {
                                console.log(err);
                            })
                            delete req.session.cart
                            return res.json({ message : 'OrderPlaced but payment failed, You can pay at delivery time' });
                        })
                    } else {
                        transporter.sendMail({
                            to:placedOrder.customerId.email,
                            from: '//YOUR VERIFIED EMAIL ID HERE',
                            subject: 'Order Placed Successfully' ,
                            html: `<h1>You have successfully placed your order . Payment to be done as COD . </h1> <br> <h3> Your food will arrive soon. </h3>`
                        }).catch((err)=> {
                            console.log(err);
                        })
                        delete req.session.cart
                        return res.json({ message : 'Order placed succesfully' });
                    }
                })
            }).catch(err => {
                return res.status(500).json({ message : 'Something went wrong' });
            })
        },
        
        async index(req, res) {
            const orders = await Order.find({ customerId: req.user._id }, 
                null, 
                { sort: { 'createdAt': -1 } } )
            res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0')
            res.render('customers/orders', { orders: orders, moment: moment })
        },
        async show(req, res) {
            const order = await Order.findById(req.params.id)
            // Authorize user
            if(req.user._id.toString() === order.customerId.toString()) {
                return res.render('customers/singleOrder', { order })
            }
            return  res.redirect('/')
        }
    }
}

module.exports = orderController