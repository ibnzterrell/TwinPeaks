from os import getenv
from platform import architecture
from aws_cdk import (
    Stack,
    Duration,
    RemovalPolicy,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
    aws_elasticloadbalancingv2 as elb,
    aws_autoscaling as autoscaling,
    aws_route53 as route53,
    aws_rds as rds
)

from dotenv import load_dotenv

from constructs import Construct


class AnnotatorAPIStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        load_dotenv()

        self.vpc_name = getenv("vpc_name")
        # NOTE: There must be at least 2 availability zones for RDS to deploy properly
        self.vpc_max_azs = int(getenv("vpc_max_azs"))
        self.zone_name = getenv("zone_name")
        self.domain_name = getenv("domain_name")
        self.service_cluster_min = int(getenv("service_cluster_min"))
        self.service_cluster_max = int(getenv("service_cluster_max"))
        self.api_service_min = int(getenv("api_service_min"))
        self.api_service_max = int(getenv("api_service_max"))
        self.db_instance_name = getenv("db_instance_name")

        self.subnet_selection = ec2.SubnetSelection(
            subnet_type=ec2.SubnetType.PUBLIC)
        self.subnet_configuration = ec2.SubnetConfiguration(
            name=self.vpc_name + "Subnet",
            subnet_type=ec2.SubnetType.PUBLIC,
        )
        self.vpc = ec2.Vpc(self, self.vpc_name,
                           max_azs=self.vpc_max_azs,
                           nat_gateways=0,
                           subnet_configuration=[self.subnet_configuration]
                           )

        self.hosted_zone = route53.HostedZone.from_lookup(
            self, id="AnnotatorZone", domain_name=self.zone_name)

        self.service_cluster = ecs.Cluster(self, "AnnotatorCluster",
                                           vpc=self.vpc)

        self.api_container_image = ecs.ContainerImage.from_asset(
            "./api_container/")

        self.service_cluster_image = ecs.BottleRocketImage(
            architecture=ec2.InstanceArchitecture.X86_64)
        # TODO: Use ARM_64 BottleRocket with BURSTABLE4_GRAVITON
        self.service_cluster_instance_type = ec2.InstanceType.of(
            ec2.InstanceClass.BURSTABLE3_AMD, ec2.InstanceSize.MEDIUM)

        self.service_cluster_asg = self.service_cluster.add_capacity("DefaultAutoScalingGroupCapacity",
                                                                     instance_type=self.service_cluster_instance_type,
                                                                     machine_image=self.service_cluster_image,
                                                                     min_capacity=self.service_cluster_min,
                                                                     max_capacity=self.service_cluster_max
                                                                     )

        self.service_cluster_asg.scale_on_cpu_utilization("ClusterCPUScaling",
                                                          target_utilization_percent=20)

        self.api_service = ecs_patterns.ApplicationLoadBalancedEc2Service(self, "AnnotatorAPIService",
                                                                          cluster=self.service_cluster,
                                                                          cpu=256,
                                                                          memory_reservation_mib=512,
                                                                          task_image_options=ecs_patterns.ApplicationLoadBalancedTaskImageOptions(
                                                                              image=self.api_container_image,
                                                                          ),
                                                                          public_load_balancer=True,
                                                                          protocol=elb.ApplicationProtocol.HTTPS,
                                                                          target_protocol=elb.ApplicationProtocol.HTTP,
                                                                          domain_name=self.domain_name,
                                                                          domain_zone=self.hosted_zone
                                                                          )

        self.api_service.target_group.configure_health_check(path="/health")

        self.api_scalable_target = self.api_service.service.auto_scale_task_count(
            min_capacity=self.api_service_min, max_capacity=self.api_service_max
        )

        self.api_scalable_target.scale_on_cpu_utilization("APIServiceCpuScaling",
                                                          target_utilization_percent=80
                                                          )

        self.db_engine = rds.DatabaseInstanceEngine.mysql(
            version=rds.MysqlEngineVersion.VER_8_0)
        self.db_parameters = {
            "ft_min_word_len": "3",
            "ft_stopword_file": "/dev/null"
        }
        self.db_parametergroup = rds.ParameterGroup(self, "AnnotatorDBParameterGroup",
                                                    engine=self.db_engine,
                                                    parameters=self.db_parameters
                                                    )

        self.db_instance = rds.DatabaseInstance(self, "AnnotationDatabase",
                                                engine=self.db_engine,
                                                vpc=self.vpc,
                                                instance_type=ec2.InstanceType.of(
                                                    ec2.InstanceClass.BURSTABLE4_GRAVITON, ec2.InstanceSize.MEDIUM),
                                                allow_major_version_upgrade=False,
                                                auto_minor_version_upgrade=True,
                                                publicly_accessible=True,
                                                vpc_subnets=self.subnet_selection,
                                                instance_identifier=self.db_instance_name,
                                                storage_encrypted=True,
                                                removal_policy=RemovalPolicy.DESTROY,
                                                parameter_group=self.db_parametergroup
                                                )
